import { inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import db from "@/db/drizzle";
import { OFFLINE_MAX_LESSONS, getCourseProgress, getUnits } from "@/db/queries";
import { lessons } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { getMode } from "@/lib/preferences";
import { recitationAudio } from "@/lib/recitation";

const REF = /^(?:quran:)?(\d+:\d+(?::\d+)?)$/;

// Every recitation reference ("s:a" or "s:a:w") anywhere in a value.
const refsIn = (value: unknown, into: Set<string>) => {
  if (typeof value === "string") {
    const ref = REF.exec(value)?.[1];
    if (ref) into.add(ref);
  } else if (Array.isArray(value)) for (const v of value) refsIn(v, into);
  else if (value && typeof value === "object")
    for (const v of Object.values(value)) refsIn(v, into);
};

/**
 * What "Download for offline" saves (lib/offline): the current lesson and
 * the ones after it in the course, and, if asked for, the recitation they
 * play (one source per ayah or word, for this mode's reciter).
 */
export const GET = async (req: NextRequest) => {
  const { userId } = await getAuth();
  if (!userId) return new NextResponse("Unauthorized.", { status: 401 });

  const params = req.nextUrl.searchParams;
  const count = Math.min(
    Math.max(Number(params.get("count")) || 5, 1),
    OFFLINE_MAX_LESSONS
  );

  const [units, { activeLessonId }] = await Promise.all([
    getUnits(),
    getCourseProgress(),
  ]);
  const courseLessons = units.flatMap((unit) => unit.lessons);
  const start = courseLessons.findIndex((l) => l.id === activeLessonId);
  const ids =
    start < 0
      ? []
      : courseLessons.slice(start, start + count).map((lesson) => lesson.id);

  if (params.get("audio") !== "1" || ids.length === 0)
    return NextResponse.json({ lessons: ids, audio: [] });

  const rows = await db.query.lessons.findMany({
    where: inArray(lessons.id, ids),
    columns: { study: true, parts: true },
    with: {
      challenges: {
        columns: { payload: true, readAloud: true },
        with: {
          challengeOptions: { columns: { recitation: true } },
          sourceText: { columns: { key: true } },
        },
      },
    },
  });

  const refs = new Set<string>();
  refsIn(rows, refs);

  const mode = await getMode();
  const audio = [...refs]
    .map((ref) => recitationAudio(ref, mode)[0])
    .filter((url): url is string => !!url);

  return NextResponse.json({ lessons: ids, audio });
};
