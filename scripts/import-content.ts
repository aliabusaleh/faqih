import { neon } from "@neondatabase/serverless";
import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "@/db/schema";

import {
  buildFatiha,
  buildMorningEvening,
  buildNawawi,
  type CourseSpec,
} from "./content/courses";
import {
  fetchHisnChapter,
  fetchNawawi,
  fetchSurah,
  type SourceText,
} from "./content/sources";

// Usage: npm run content:import [-- --refresh]
//   --refresh  re-download from the APIs instead of using content/cache
//
// Replaces ALL courses (and user progress on them) with the imported ones.

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

const refresh = process.argv.includes("--refresh");

const upsertSourceTexts = async (texts: SourceText[]) => {
  const ids = new Map<string, number>();

  for (const t of texts) {
    const values = {
      key: t.key,
      kind: t.kind,
      arabic: t.arabic,
      translation: t.translation,
      translationBy: t.translationBy,
      citation: t.citation,
      citationAr: t.citationAr,
      hadithRef: t.hadithRef,
      hadithRefAr: t.hadithRefAr,
      sourceUrl: t.sourceUrl,
      audioSrc: t.audioSrc,
      repeat: t.repeat,
    };
    const [row] = await db
      .insert(schema.sourceTexts)
      .values(values)
      .onConflictDoUpdate({ target: schema.sourceTexts.key, set: values })
      .returning({ id: schema.sourceTexts.id });
    ids.set(t.key, row.id);
  }

  return ids;
};

const insertCourse = async (
  course: CourseSpec,
  sourceIds: Map<string, number>
) => {
  const [courseRow] = await db
    .insert(schema.courses)
    .values({
      title: course.title,
      imageSrc: course.imageSrc,
      slug: course.slug,
      track: course.track,
      language: course.language,
    })
    .returning();

  let challengeCount = 0;

  for (const [u, unit] of course.units.entries()) {
    const [unitRow] = await db
      .insert(schema.units)
      .values({
        courseId: courseRow.id,
        title: unit.title,
        description: unit.description,
        order: u + 1,
      })
      .returning();

    for (const [l, lesson] of unit.lessons.entries()) {
      const [lessonRow] = await db
        .insert(schema.lessons)
        .values({
          unitId: unitRow.id,
          title: lesson.title,
          order: l + 1,
          reviewStatus: "draft",
        })
        .returning();

      for (const [c, challenge] of lesson.challenges.entries()) {
        const sourceTextId = sourceIds.get(challenge.sourceKey);
        if (!sourceTextId)
          throw new Error(`No source text for ${challenge.sourceKey}`);

        const [challengeRow] = await db
          .insert(schema.challenges)
          .values({
            lessonId: lessonRow.id,
            type: "ASSIST",
            prompt: challenge.prompt,
            question: challenge.question,
            sourceTextId,
            order: c + 1,
          })
          .returning();

        await db.insert(schema.challengeOptions).values(
          challenge.options.map((o) => ({
            challengeId: challengeRow.id,
            text: o.text,
            correct: o.correct,
          }))
        );
        challengeCount++;
      }
    }
  }

  console.log(
    `  ${course.title}: ${course.units.length} unit(s), ${course.units.flatMap((u) => u.lessons).length} lessons, ${challengeCount} challenges`
  );
};

const main = async () => {
  console.log(`Fetching sources${refresh ? " (refresh)" : ""}…`);
  const [fatiha, nawawi, morningEvening] = await Promise.all([
    fetchSurah(1, refresh),
    fetchNawawi(refresh),
    fetchHisnChapter(27, refresh),
  ]);

  const missingRefs = morningEvening.filter((d) => !d.hadithRef).length;
  console.log(
    `  Al-Fatiha: ${fatiha.length} ayat · Nawawi: ${nawawi.length} hadith · Hisn al-Muslim ch. 27: ${morningEvening.length} adhkar (${missingRefs} still need a hadith reference)`
  );

  console.log("Saving source texts…");
  const sourceIds = await upsertSourceTexts([
    ...fatiha,
    ...nawawi,
    ...morningEvening,
  ]);

  console.log("Replacing courses…");
  // Cascades to units, lessons, challenges, options and progress.
  await db.delete(schema.courses);

  // One course per language; nothing mixes Arabic and English.
  for (const lang of ["ar", "en"] as const)
    for (const course of [
      buildFatiha(fatiha, lang),
      buildNawawi(nawawi, 10, lang),
      buildMorningEvening(morningEvening, lang),
    ])
      await insertCourse(course, sourceIds);

  console.log("Done. All lessons are drafts until reviewed.");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
