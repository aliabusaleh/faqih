import { redirect } from "next/navigation";

import {
  getDailyReview,
  getUserProgress,
  getUserSubscription,
} from "@/db/queries";

import { Quiz } from "../quiz";

// Today's review (spaced repetition, lib/review.ts): a few questions on the
// ayat that are due. No hearts are lost or earned; the first try at each
// question moves its ayah on the schedule.
const DailyReviewPage = async () => {
  const [challenges, userProgress, userSubscription] = await Promise.all([
    getDailyReview(),
    getUserProgress(),
    getUserSubscription(),
  ]);

  if (!userProgress || challenges.length === 0) redirect("/learn");

  return (
    <Quiz
      initialLessonId={0}
      reviewStatus={
        challenges.every((c) => c.lesson.reviewStatus === "reviewed")
          ? "reviewed"
          : "draft"
      }
      initialLessonChallenges={challenges}
      initialHearts={userProgress.hearts}
      initialPercentage={0}
      userSubscription={userSubscription}
      review={{ kind: "daily", returnHref: "/learn" }}
    />
  );
};

export default DailyReviewPage;
