"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { MAX_HEARTS } from "@/constants";
import db from "@/db/drizzle";
import { getUserProgress, getUserSubscription } from "@/db/queries";
import {
  challengeProgress,
  challenges,
  reviewItems,
  userProgress,
} from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { addDays } from "@/lib/day";
import { getMode, getToday } from "@/lib/preferences";

export const upsertChallengeProgress = async (challengeId: number) => {
  const { userId } = await getAuth();

  if (!userId) throw new Error("Unauthorized.");

  const currentUserProgress = await getUserProgress();
  const userSubscription = await getUserSubscription();

  if (!currentUserProgress) throw new Error("User progress not found.");

  const challenge = await db.query.challenges.findFirst({
    where: eq(challenges.id, challengeId),
  });

  if (!challenge) throw new Error("Challenge not found.");

  const lessonId = challenge.lessonId;

  const existingChallengeProgress = await db.query.challengeProgress.findFirst({
    where: and(
      eq(challengeProgress.userId, userId),
      eq(challengeProgress.challengeId, challengeId)
    ),
  });

  const isPractice = !!existingChallengeProgress;

  // Kids mode has no hearts, so running out never stops a lesson.
  if (
    currentUserProgress.hearts === 0 &&
    !isPractice &&
    !userSubscription?.isActive &&
    (await getMode()) !== "kids"
  )
    return { error: "hearts" };

  if (isPractice) {
    await db
      .update(challengeProgress)
      .set({
        completed: true,
      })
      .where(eq(challengeProgress.id, existingChallengeProgress.id));

    await db
      .update(userProgress)
      .set({
        hearts: Math.min(currentUserProgress.hearts + 1, MAX_HEARTS),
        points: currentUserProgress.points + 10,
      })
      .where(eq(userProgress.userId, userId));

    revalidatePath("/learn");
    revalidatePath("/lesson");
    revalidatePath("/quests");
    revalidatePath("/leaderboard");
    revalidatePath(`/lesson/${lessonId}`);
    return;
  }

  await db.insert(challengeProgress).values({
    challengeId,
    userId,
    completed: true,
  });

  // Learned: on the daily review schedule, first asked again tomorrow.
  if (challenge.sourceTextId)
    await db
      .insert(reviewItems)
      .values({
        userId,
        sourceTextId: challenge.sourceTextId,
        dueOn: addDays(await getToday(), 1),
      })
      .onConflictDoNothing();

  await db
    .update(userProgress)
    .set({
      points: currentUserProgress.points + 10,
    })
    .where(eq(userProgress.userId, userId));

  revalidatePath("/learn");
  revalidatePath("/lesson");
  revalidatePath("/quests");
  revalidatePath("/leaderboard");
  revalidatePath(`/lesson/${lessonId}`);
};

/**
 * "Can't listen now": the listening questions are marked done without
 * points or hearts, so the lesson can still be finished. Only LISTEN
 * questions can be skipped this way.
 */
export const skipListening = async (challengeIds: number[]) => {
  const { userId } = await getAuth();
  if (!userId) throw new Error("Unauthorized.");
  if (challengeIds.length === 0) return;

  const listening = await db.query.challenges.findMany({
    where: and(
      inArray(challenges.id, challengeIds),
      eq(challenges.type, "LISTEN")
    ),
    columns: { id: true, lessonId: true },
  });

  for (const { id } of listening) {
    const existing = await db.query.challengeProgress.findFirst({
      where: and(
        eq(challengeProgress.userId, userId),
        eq(challengeProgress.challengeId, id)
      ),
    });
    if (existing)
      await db
        .update(challengeProgress)
        .set({ completed: true })
        .where(eq(challengeProgress.id, existing.id));
    else
      await db
        .insert(challengeProgress)
        .values({ challengeId: id, userId, completed: true });
  }

  revalidatePath("/learn");
  for (const lessonId of new Set(listening.map((c) => c.lessonId)))
    revalidatePath(`/lesson/${lessonId}`);
};
