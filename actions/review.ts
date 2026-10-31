"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { MAX_HEARTS } from "@/constants";
import db from "@/db/drizzle";
import { getUserProgress } from "@/db/queries";
import {
  challengeProgress,
  challenges,
  mistakes,
  reviewItems,
  userProgress,
} from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { getToday } from "@/lib/preferences";
import { activeDay, nextSchedule, nextStreak } from "@/lib/review";

/**
 * A right answer in a hearts review: one heart back, and the mistake is
 * cleared. Only for questions the learner got wrong, or (when there are no
 * mistakes to review) ones they already completed, so hearts can't be farmed
 * from questions they never saw.
 */
export const reviewAnswer = async (challengeId: number) => {
  const { userId } = await getAuth();
  if (!userId) throw new Error("Unauthorized.");

  const progress = await getUserProgress();
  if (!progress) throw new Error("User progress not found.");

  const owned = and(
    eq(mistakes.userId, userId),
    eq(mistakes.challengeId, challengeId)
  );
  const mistake = await db.query.mistakes.findFirst({ where: owned });
  const completed =
    mistake ??
    (await db.query.challengeProgress.findFirst({
      where: and(
        eq(challengeProgress.userId, userId),
        eq(challengeProgress.challengeId, challengeId),
        eq(challengeProgress.completed, true)
      ),
    }));
  if (!completed) throw new Error("Not a question to review.");

  if (mistake) await db.delete(mistakes).where(owned);

  const hearts = Math.min(progress.hearts + 1, MAX_HEARTS);
  await db
    .update(userProgress)
    .set({ hearts })
    .where(eq(userProgress.userId, userId));

  revalidatePath("/learn");
  revalidatePath("/shop");
  return { hearts };
};

/**
 * An answer in the daily review (the first try at a question): moves its
 * ayah up the schedule, or back to tomorrow (lib/review.ts). A right answer
 * earns points. Hearts are never touched: revision is never blocked.
 * Only for an ayah due today, once a day.
 */
export const answerDailyReview = async (
  challengeId: number,
  correct: boolean
) => {
  const { userId } = await getAuth();
  if (!userId) throw new Error("Unauthorized.");

  const challenge = await db.query.challenges.findFirst({
    where: eq(challenges.id, challengeId),
    columns: { sourceTextId: true },
  });
  if (!challenge?.sourceTextId) throw new Error("Not a question to review.");

  const item = await db.query.reviewItems.findFirst({
    where: and(
      eq(reviewItems.userId, userId),
      eq(reviewItems.sourceTextId, challenge.sourceTextId)
    ),
  });
  const today = await getToday();
  if (!item || item.dueOn > today || item.lastReviewedOn === today) return;

  const next = nextSchedule(item.box, correct, today);
  await db
    .update(reviewItems)
    .set({
      box: next.box,
      dueOn: next.dueOn,
      lastReviewedOn: today,
      lapses: item.lapses + (next.lapsed ? 1 : 0),
    })
    .where(eq(reviewItems.id, item.id));

  if (correct) {
    const progress = await getUserProgress();
    if (progress)
      await db
        .update(userProgress)
        .set({ points: progress.points + 10 })
        .where(eq(userProgress.userId, userId));
  }

  revalidatePath("/learn");
  revalidatePath("/modes");
  revalidatePath("/leaderboard");
};

/**
 * A lesson or the day's review is finished: today counts for the streak.
 * `day`: a lesson finished offline, sent once back online (lib/review
 * activeDay). Days only count forward: one before the last day that
 * counted can't change the streak.
 */
export const recordActiveDay = async (day?: string) => {
  const { userId } = await getAuth();
  if (!userId) throw new Error("Unauthorized.");

  const progress = await getUserProgress();
  if (!progress) return;

  const active = activeDay(day, await getToday());
  if (!active || (progress.lastActiveOn && active <= progress.lastActiveOn))
    return;

  await db
    .update(userProgress)
    .set(nextStreak(progress, active))
    .where(eq(userProgress.userId, userId));

  revalidatePath("/learn");
};
