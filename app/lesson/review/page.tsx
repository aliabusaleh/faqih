import { redirect } from "next/navigation";

import {
  getReviewChallenges,
  getUserProgress,
  getUserSubscription,
} from "@/db/queries";
import { getMode } from "@/lib/preferences";

import { Quiz } from "../quiz";

type ReviewPageProps = {
  // The lesson to go back to once hearts are earned.
  searchParams: Promise<{ from?: string }>;
};

// Hearts review: the learner's latest mistakes. Each right answer gives a
// heart back (actions/review.ts); then "Continue" returns to the lesson.
const ReviewPage = async ({ searchParams }: ReviewPageProps) => {
  const [{ from }, challenges, userProgress, userSubscription, mode] =
    await Promise.all([
      searchParams,
      getReviewChallenges(),
      getUserProgress(),
      getUserSubscription(),
      getMode(),
    ]);

  // Kids mode has no hearts; nothing to review without questions.
  if (!userProgress || mode === "kids" || challenges.length === 0)
    redirect("/learn");

  const lessonId = Number(from);
  const returnHref =
    Number.isInteger(lessonId) && lessonId > 0
      ? `/lesson/${lessonId}`
      : "/learn";

  return (
    <Quiz
      initialLessonId={lessonId || 0}
      reviewStatus={
        challenges.every((c) => c.lesson.reviewStatus === "reviewed")
          ? "reviewed"
          : "draft"
      }
      initialLessonChallenges={challenges}
      initialHearts={userProgress.hearts}
      initialPercentage={0}
      userSubscription={userSubscription}
      review={{ kind: "hearts", returnHref }}
    />
  );
};

export default ReviewPage;
