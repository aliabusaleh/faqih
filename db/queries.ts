import { cache } from "react";

import { and, countDistinct, eq, inArray, sql } from "drizzle-orm";

import { features } from "@/config";
import { getAuth } from "@/lib/auth";
import { JUZ_COUNT, juzBounds } from "@/lib/juz";
import { getLocale } from "@/lib/locale";
import { courseInMode } from "@/lib/mode";
import { getLastUnitId, getMode, getToday } from "@/lib/preferences";
import { computeProgress, firstOpenLesson } from "@/lib/progress";
import { REVIEW_SIZE as DAILY_REVIEW_SIZE } from "@/lib/review";

import db from "./drizzle";
import {
  challengeProgress,
  challenges,
  courses,
  lessons,
  mistakes,
  reviewItems,
  sourceTexts,
  surahs,
  units,
  userProgress,
  userSubscription,
} from "./schema";

const DAY_IN_MS = 86_400_000;

// Only courses in the visitor's language, and for their mode (kids/full).
export const getCourses = cache(async () => {
  const [data, mode] = await Promise.all([
    db.query.courses.findMany({
      where: eq(courses.language, await getLocale()),
    }),
    getMode(),
  ]);

  return data.filter((course) => courseInMode(course.track, mode));
});

/** Tracks that have at least one course in the visitor's language. */
export const getAvailableTracks = cache(async () => {
  const rows = await db
    .selectDistinct({ track: courses.track })
    .from(courses)
    .where(eq(courses.language, await getLocale()));
  return new Set(rows.map((r) => r.track));
});

// Draft lessons are hidden unless features.showDrafts is on.
const visibleLessons = features.showDrafts
  ? undefined
  : eq(lessons.reviewStatus, "reviewed");

export const getUserProgress = cache(async () => {
  const { userId } = await getAuth();

  if (!userId) return null;

  const data = await db.query.userProgress.findFirst({
    where: eq(userProgress.userId, userId),
    with: {
      activeCourse: true,
    },
  });

  // A course in the other language, or for the other mode, isn't active
  // while this language and mode are chosen.
  if (
    data?.activeCourse &&
    (data.activeCourse.language !== (await getLocale()) ||
      !courseInMode(data.activeCourse.track, await getMode()))
  )
    return { ...data, activeCourse: null, activeCourseId: null };

  return data;
});

export const getUnits = cache(async () => {
  const { userId } = await getAuth();
  const userProgress = await getUserProgress();

  if (!userId || !userProgress?.activeCourseId) return [];

  // The full Quran course has thousands of lessons and tens of thousands of
  // challenges: the database counts each lesson's challenges and how many
  // the learner has done, rather than sending every challenge here.
  const [data, counts] = await Promise.all([
    db.query.units.findMany({
      where: eq(units.courseId, userProgress.activeCourseId),
      orderBy: (units, { asc }) => [asc(units.order)],
      with: {
        lessons: {
          where: visibleLessons,
          orderBy: (lessons, { asc }) => [asc(lessons.order)],
        },
      },
    }),
    db
      .select({
        lessonId: challenges.lessonId,
        total: countDistinct(challenges.id),
        done: sql<number>`count(distinct ${challenges.id}) filter (where ${challengeProgress.completed})`.mapWith(
          Number
        ),
      })
      .from(challenges)
      .innerJoin(lessons, eq(lessons.id, challenges.lessonId))
      .innerJoin(units, eq(units.id, lessons.unitId))
      .leftJoin(
        challengeProgress,
        and(
          eq(challengeProgress.challengeId, challenges.id),
          eq(challengeProgress.userId, userId)
        )
      )
      .where(eq(units.courseId, userProgress.activeCourseId))
      .groupBy(challenges.lessonId),
  ]);
  const countOf = new Map(counts.map((c) => [c.lessonId, c]));

  const withCompletion = data.map((unit) => ({
    ...unit,
    lessons: unit.lessons.map((lesson) => {
      const { total = 0, done = 0 } = countOf.get(lesson.id) ?? {};

      return {
        ...lesson,
        completed: total > 0 && done === total,
        percentage: total ? Math.round((done / total) * 100) : 0,
      };
    }),
  }));

  return computeProgress(withCompletion);
});

export const getCourseById = cache(async (courseId: number) => {
  const data = await db.query.courses.findFirst({
    where: eq(courses.id, courseId),
    with: {
      units: {
        orderBy: (units, { asc }) => [asc(units.order)],
        with: {
          lessons: {
            where: visibleLessons,
            orderBy: (lessons, { asc }) => [asc(lessons.order)],
          },
        },
      },
    },
  });

  return data;
});

export const getCourseProgress = cache(async () => {
  const [units, lastUnitId] = await Promise.all([getUnits(), getLastUnitId()]);
  // Carry on in the surah the learner was last in, unless it is cleared.
  const lastUnit = units.find((u) => u.id === lastUnitId && !u.cleared);
  const activeLesson =
    (lastUnit && firstOpenLesson([lastUnit])) ?? firstOpenLesson(units);

  return { activeLesson, activeLessonId: activeLesson?.id };
});

// A hearts review: the learner's latest mistakes (topped up with questions
// they already completed, if they have fewer), each with what the quiz needs.
const REVIEW_SIZE = 3;

export const getReviewChallenges = cache(async () => {
  const { userId } = await getAuth();
  if (!userId) return [];

  const details = {
    challengeOptions: true,
    sourceText: true,
    lesson: { columns: { reviewStatus: true } },
  } as const;

  const recent = await db.query.mistakes.findMany({
    where: eq(mistakes.userId, userId),
    orderBy: (m, { desc }) => [desc(m.lastWrongAt)],
    limit: REVIEW_SIZE,
    with: { challenge: { with: details } },
  });
  const picked = recent.map((m) => m.challenge);

  if (picked.length < REVIEW_SIZE) {
    const done = await db.query.challengeProgress.findMany({
      where: and(
        eq(challengeProgress.userId, userId),
        eq(challengeProgress.completed, true)
      ),
      orderBy: (p, { desc }) => [desc(p.id)],
      limit: REVIEW_SIZE * 2,
      with: { challenge: { with: details } },
    });
    for (const { challenge } of done)
      if (
        picked.length < REVIEW_SIZE &&
        !picked.some((c) => c.id === challenge.id)
      )
        picked.push(challenge);
  }

  return picked.map((challenge) => ({ ...challenge, completed: false }));
});

// The daily review (lib/review.ts): what the learner has learned and is due
// today, each asked with one of the questions already written about it.

/**
 * Puts everything the learner has learned on the review schedule. New
 * ayat are added as they are learned (actions/challenge-progress); this
 * catches up what was learned before the schedule existed, spread over the
 * next two weeks so it doesn't arrive as one long review.
 */
const ensureReviewItems = cache(async (userId: string, today: string) => {
  await db.execute(sql`
    insert into ${reviewItems} (user_id, source_text_id, box, due_on)
    select ${userId}, learned.id, 0,
      ${today}::date + 1 + (row_number() over (order by learned.id))::int % 14
    from (
      select distinct ${challenges.sourceTextId} as id
      from ${challengeProgress}
      join ${challenges} on ${challenges.id} = ${challengeProgress.challengeId}
      where ${challengeProgress.userId} = ${userId}
        and ${challengeProgress.completed}
        and ${challenges.sourceTextId} is not null
    ) learned
    on conflict do nothing
  `);
});

/**
 * The due texts that can be asked in the learner's current language and
 * mode (its courses), most overdue first, each with one question picked at
 * random among those written about it.
 */
const dueQuestions = async (userId: string, today: string) => {
  const courseIds = (await getCourses()).map((course) => course.id);
  if (courseIds.length === 0) return [];
  await ensureReviewItems(userId, today);

  const { rows } = await db.execute<{
    challenge_id: number;
    due_on: string;
  }>(sql`
    select challenge_id, due_on from (
      select distinct on (${reviewItems.sourceTextId})
        ${challenges.id} as challenge_id, ${reviewItems.dueOn} as due_on
      from ${reviewItems}
      join ${challenges} on ${challenges.sourceTextId} = ${reviewItems.sourceTextId}
      join ${lessons} on ${lessons.id} = ${challenges.lessonId}
      join ${units} on ${units.id} = ${lessons.unitId}
      where ${reviewItems.userId} = ${userId}
        and ${reviewItems.dueOn} <= ${today}
        and ${inArray(units.courseId, courseIds)}
        ${visibleLessons ? sql`and ${visibleLessons}` : sql``}
      order by ${reviewItems.sourceTextId}, random()
    ) due
    order by due_on, random()
  `);
  return rows;
};

/** How many texts are due today, and whether any were reviewed today. */
export const getDailyReviewStatus = cache(async () => {
  const { userId } = await getAuth();
  if (!userId) return { due: 0, doneToday: false };

  const today = await getToday();
  const [due, reviewed] = await Promise.all([
    dueQuestions(userId, today),
    db.query.reviewItems.findFirst({
      where: and(
        eq(reviewItems.userId, userId),
        eq(reviewItems.lastReviewedOn, today)
      ),
      columns: { id: true },
    }),
  ]);
  const size = DAILY_REVIEW_SIZE[await getMode()];

  return { due: Math.min(due.length, size), doneToday: !!reviewed };
});

/** Today's review: at most REVIEW_SIZE questions, with what the quiz needs. */
export const getDailyReview = cache(async () => {
  const { userId } = await getAuth();
  if (!userId) return [];

  const size = DAILY_REVIEW_SIZE[await getMode()];
  const ids = (await dueQuestions(userId, await getToday()))
    .slice(0, size)
    .map((row) => row.challenge_id);
  if (ids.length === 0) return [];

  const rows = await db.query.challenges.findMany({
    where: inArray(challenges.id, ids),
    with: {
      challengeOptions: true,
      sourceText: true,
      lesson: { columns: { reviewStatus: true } },
    },
  });

  return ids
    .map((id) => rows.find((row) => row.id === id))
    .filter((row) => row !== undefined)
    .map((challenge) => ({ ...challenge, completed: false }));
});

/** How many lessons ahead of the current one can be downloaded for offline use. */
export const OFFLINE_MAX_LESSONS = 20;

/**
 * `offline`: a download for offline use (lib/offline) may also get the
 * lessons right after the current one, still locked, so they can be done
 * without a connection.
 */
export const getLesson = cache(async (id?: number, offline = false) => {
  const { userId } = await getAuth();

  if (!userId) return null;

  const courseProgress = await getCourseProgress();
  const lessonId = id || courseProgress?.activeLessonId;

  if (!lessonId) return null;

  // Only lessons of the active course that are open (see lib/progress).
  const courseLessons = (await getUnits()).flatMap((unit) => unit.lessons);
  const position = courseLessons.findIndex((lesson) => lesson.id === lessonId);
  const lessonState = courseLessons[position];
  const current = courseLessons.findIndex(
    (lesson) => lesson.id === courseProgress.activeLessonId
  );
  const ahead =
    offline &&
    current >= 0 &&
    position > current &&
    position <= current + OFFLINE_MAX_LESSONS;
  if (!lessonState || (lessonState.locked && !ahead)) return null;

  // The lesson after this one in the course (e.g. ayat 11-15 after 6-10, or
  // the unit's exam): "Continue" goes there, and it is preloaded.
  const following = courseLessons[position + 1];
  const nextLesson = following
    ? { id: following.id, study: following.study ?? [] }
    : null;

  const data = await db.query.lessons.findFirst({
    where: eq(lessons.id, lessonId),
    with: {
      challenges: {
        orderBy: (challenges, { asc }) => [asc(challenges.order)],
        with: {
          challengeOptions: true,
          sourceText: true,
          challengeProgress: {
            where: eq(challengeProgress.userId, userId),
          },
        },
      },
    },
  });

  if (!data || !data.challenges) return null;
  if (data.reviewStatus !== "reviewed" && !features.showDrafts) return null;

  const normalizedChallenges = data.challenges.map((challenge) => {
    const completed =
      challenge.challengeProgress &&
      challenge.challengeProgress.length > 0 &&
      challenge.challengeProgress.every((progress) => progress.completed);

    return { ...challenge, completed };
  });

  // The texts to read before the questions, in the lesson's order; for a
  // lesson in parts, also what to read before each part.
  const study = data.study ?? [];
  const keys = [...new Set([...study, ...(data.parts ?? []).flat()])];
  const texts = keys.length
    ? await db.query.sourceTexts.findMany({
        where: inArray(sourceTexts.key, keys),
      })
    : [];
  const textOf = (key: string) => texts.find((t) => t.key === key);
  const inOrder = (list: string[]) =>
    list.map(textOf).filter((t) => t !== undefined);
  const studyTexts = inOrder(study);
  const studyParts = data.parts ? data.parts.map(inOrder) : null;

  // English mode: the meaning of each ayah shown in the lesson (questions,
  // options), shown under the Arabic. Keyed by "surah:ayah".
  const meanings: Record<string, string> = {};
  if ((await getLocale()) === "en") {
    const refs = new Set<string>();
    for (const c of data.challenges) {
      for (const ref of c.readAloud?.ayat ?? []) refs.add(ref);
      for (const o of c.challengeOptions)
        if (o.recitation?.split(":").length === 2) refs.add(o.recitation);
      if (c.sourceText?.kind === "ayah")
        refs.add(c.sourceText.key.replace(/^quran:/, ""));
    }
    if (refs.size) {
      const rows = await db.query.sourceTexts.findMany({
        where: inArray(
          sourceTexts.key,
          [...refs].map((ref) => `quran:${ref}`)
        ),
        columns: { key: true, translation: true },
      });
      for (const row of rows)
        if (row.translation)
          meanings[row.key.replace(/^quran:/, "")] = row.translation;
    }
  }

  return {
    ...data,
    challenges: normalizedChallenges,
    studyTexts,
    studyParts,
    meanings,
    nextLesson,
  };
});

export const getUserSubscription = cache(async () => {
  const { userId } = await getAuth();

  if (!userId) return null;

  const data = await db.query.userSubscription.findFirst({
    where: eq(userSubscription.userId, userId),
  });

  if (!data) return null;

  const isActive =
    data.stripePriceId &&
    data.stripeCurrentPeriodEnd?.getTime() + DAY_IN_MS > Date.now();

  return {
    ...data,
    isActive: !!isActive,
  };
});

export const getTopTenUsers = cache(async () => {
  const { userId } = await getAuth();

  if (!userId) return [];

  const data = await db.query.userProgress.findMany({
    orderBy: (userProgress, { desc }) => [desc(userProgress.points)],
    limit: 10,
    columns: {
      userId: true,
      userName: true,
      userImageSrc: true,
      points: true,
    },
  });

  return data;
});

// Read mode: the 114 surahs, in mushaf order.
export const getSurahs = cache(async () =>
  db.query.surahs.findMany({ orderBy: [surahs.number] })
);

/** Read mode: a whole surah, or a juz' (which may start or end mid-surah). */
export const getPassage = cache(async (by: "surah" | "juz", n: number) => {
  const all = await getSurahs();
  const ayahCount = new Map(all.map((s) => [s.number, s.ayahCount]));

  // [surah, first ayah, last ayah] for each surah in the passage.
  let parts: [number, number, number][] = [];
  if (by === "surah" && ayahCount.has(n)) parts = [[n, 1, ayahCount.get(n)!]];
  if (by === "juz" && n >= 1 && n <= JUZ_COUNT) {
    const { start, end } = juzBounds(n);
    const lastSurah = end ? (end.ayah === 1 ? end.surah - 1 : end.surah) : 114;
    for (let surah = start.surah; surah <= lastSurah; surah++) {
      const count = ayahCount.get(surah);
      if (!count) continue;
      const first = surah === start.surah ? start.ayah : 1;
      const last = end && surah === end.surah ? end.ayah - 1 : count;
      parts.push([surah, first, last]);
    }
  }
  if (parts.length === 0) return null;

  const keys = parts.flatMap(([surah, first, last]) =>
    Array.from(
      { length: last - first + 1 },
      (_, i) => `quran:${surah}:${first + i}`
    )
  );
  // The basmalah opens every surah but at-Tawbah; it is al-Fatiha's first ayah.
  const rows = await db
    .select({
      key: sourceTexts.key,
      arabic: sourceTexts.arabic,
      translation: sourceTexts.translation,
    })
    .from(sourceTexts)
    .where(inArray(sourceTexts.key, [...keys, "quran:1:1"]));
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const surahOf = new Map(all.map((s) => [s.number, s]));

  return {
    basmalah: byKey.get("quran:1:1")?.arabic ?? null,
    sections: parts.map(([surah, first, last]) => {
      const info = surahOf.get(surah)!;
      return {
        surah,
        name: info.name,
        englishName: info.englishName,
        englishNameTranslation: info.englishNameTranslation,
        fromStart: first === 1,
        ayat: Array.from({ length: last - first + 1 }, (_, i) => {
          const row = byKey.get(`quran:${surah}:${first + i}`);
          return {
            ref: `${surah}:${first + i}`,
            number: first + i,
            arabic: row?.arabic ?? "",
            translation: row?.translation ?? null,
          };
        }).filter((ayah) => ayah.arabic),
      };
    }),
  };
});

export type Passage = NonNullable<Awaited<ReturnType<typeof getPassage>>>;
