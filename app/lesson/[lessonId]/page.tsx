import { redirect } from "next/navigation";

import { getLesson, getUserProgress, getUserSubscription } from "@/db/queries";

import { Quiz } from "../quiz";

type LessonIdPageProps = {
  params: Promise<{
    lessonId: string;
  }>;
  searchParams: Promise<{ offline?: string }>;
};

const LessonIdPage = async ({ params, searchParams }: LessonIdPageProps) => {
  const { lessonId } = await params;
  const { offline } = await searchParams;

  const lessonData = getLesson(Number(lessonId), offline === "1");
  const userProgressData = getUserProgress();
  const userSubscriptionData = getUserSubscription();

  const [lesson, userProgress, userSubscription] = await Promise.all([
    lessonData,
    userProgressData,
    userSubscriptionData,
  ]);

  if (!lesson || !userProgress) return redirect("/learn");

  const initialPercentage =
    (lesson.challenges.filter((challenge) => challenge.completed).length /
      lesson.challenges.length) *
    100;

  return (
    <Quiz
      initialLessonId={lesson.id}
      unitId={lesson.unitId}
      reviewStatus={lesson.reviewStatus}
      isExam={lesson.kind === "exam"}
      studyTexts={lesson.studyTexts}
      studyParts={lesson.studyParts}
      meanings={lesson.meanings}
      nextLesson={lesson.nextLesson}
      initialLessonChallenges={lesson.challenges}
      initialHearts={userProgress.hearts}
      initialPercentage={initialPercentage}
      userSubscription={userSubscription}
    />
  );
};

export default LessonIdPage;
