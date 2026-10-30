import { addDays } from "@/lib/day";
import type { Mode } from "@/lib/mode";

// The daily review: spaced repetition, one schedule per learned ayah (or
// hadith, dhikr). Each starts in box 0. A right answer moves it up a box,
// and it comes back after that box's days; a wrong one sends it back to
// box 0, due tomorrow. Well-known ayat come back rarely, weak ones often.

/** Days until the next review, by box. */
export const BOX_DAYS = [1, 3, 7, 14, 30, 60, 120];

/** At most this many questions in a day's review. */
export const REVIEW_SIZE: Record<Mode, number> = { full: 10, kids: 5 };

/** The schedule after an answer on `today`. */
export const nextSchedule = (box: number, correct: boolean, today: string) => {
  const next = correct ? Math.min(box + 1, BOX_DAYS.length - 1) : 0;
  return { box: next, dueOn: addDays(today, BOX_DAYS[next]), lapsed: !correct };
};

type Streak = {
  streak: number;
  bestStreak: number;
  lastActiveOn: string | null;
};

/** The streak once `today` counts (a lesson or the day's review finished). */
export const nextStreak = (
  { streak, bestStreak, lastActiveOn }: Streak,
  today: string
): Streak => {
  if (lastActiveOn === today) return { streak, bestStreak, lastActiveOn };
  const next = lastActiveOn === addDays(today, -1) ? streak + 1 : 1;
  return {
    streak: next,
    bestStreak: Math.max(bestStreak, next),
    lastActiveOn: today,
  };
};

/** The streak to show: broken if neither today nor yesterday counted. */
export const currentStreak = (
  { streak, lastActiveOn }: Pick<Streak, "streak" | "lastActiveOn">,
  today: string
) =>
  lastActiveOn === today || lastActiveOn === addDays(today, -1) ? streak : 0;
