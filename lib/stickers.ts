// Kids stickers: one per lesson, earned by completing it. Worked out from
// progress, never stored or drawn at random: every child gets the same
// sticker for the same lesson, and keeps it when lessons are re-imported.
// Pure, so it can be tested without a DB.
//
// Adab: objects only (no people or animals), and nothing gambling-like.

import { type LessonKind } from "@/lib/progress";

/** A lesson's sticker, by its place among its unit's lessons. */
export const STICKER_DESIGNS = [
  "crescent",
  "star",
  "lantern",
  "palm",
  "dome",
  "flower",
] as const;

/** A unit's exam earns a medal. */
export type StickerDesign = (typeof STICKER_DESIGNS)[number] | "medal";

/** Each surah has its own colour, in course order (then again). */
export const SURAH_COLOURS = [
  "#3a62a0", // navy
  "#0f8b8d", // teal
  "#7c5cbf", // violet
  "#e07a1f", // orange
  "#2a9fd6", // sky
  "#b5486a", // plum
  "#5b8c2a", // olive
  "#c25b3a", // terracotta
  "#4f5bd5", // indigo
  "#0d7a5f", // pine
  "#b88f00", // dark gold
] as const;

export type Sticker = { design: StickerDesign; colour: string };

/**
 * The sticker for the `lessonIndex`-th lesson of the `unitIndex`-th unit
 * (both from 0; an exam's index doesn't matter).
 */
export const stickerOf = (
  unitIndex: number,
  lessonIndex: number,
  kind: LessonKind
): Sticker => ({
  design:
    kind === "exam"
      ? "medal"
      : STICKER_DESIGNS[lessonIndex % STICKER_DESIGNS.length],
  colour: SURAH_COLOURS[unitIndex % SURAH_COLOURS.length],
});

type AlbumUnit = {
  id: number;
  title: string;
  lessons: { id: number; kind: LessonKind; completed: boolean }[];
};

export type AlbumRow = {
  unitId: number;
  title: string;
  stickers: (Sticker & { lessonId: number; earned: boolean })[];
};

/** The units' lessons as stickers: earned when the lesson is completed. */
export const stickerAlbum = (units: AlbumUnit[]) => {
  const rows: AlbumRow[] = units
    .filter((unit) => unit.lessons.length > 0)
    .map((unit, unitIndex) => {
      let lessonIndex = 0;
      return {
        unitId: unit.id,
        title: unit.title,
        stickers: unit.lessons.map((lesson) => ({
          lessonId: lesson.id,
          earned: lesson.completed,
          ...stickerOf(
            unitIndex,
            lesson.kind === "exam" ? 0 : lessonIndex++,
            lesson.kind
          ),
        })),
      };
    });
  const all = rows.flatMap((row) => row.stickers);
  return {
    rows,
    earned: all.filter((s) => s.earned).length,
    total: all.length,
  };
};

/** One lesson's sticker in its units, or null if it isn't there. */
export const lessonSticker = (units: AlbumUnit[], lessonId: number) =>
  stickerAlbum(units)
    .rows.flatMap((row) => row.stickers)
    .find((s) => s.lessonId === lessonId) ?? null;
