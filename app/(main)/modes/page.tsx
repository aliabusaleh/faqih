import { redirect } from "next/navigation";

import {
  getCourses,
  getDailyReviewStatus,
  getUserProgress,
} from "@/db/queries";
import { getLocale } from "@/lib/locale";
import { getMode } from "@/lib/preferences";

import { type Mode, ModeCards } from "./mode-cards";

// Learning modes: the ways to learn, side by side. Memorise (the lessons),
// read (read mode), review (today's spaced review) and exams (juz' exams).
const ModesPage = async () => {
  const [userProgress, courses, review, mode, locale] = await Promise.all([
    getUserProgress(),
    getCourses(),
    getDailyReviewStatus(),
    getMode(),
    getLocale(),
  ]);
  if (!userProgress || !userProgress.activeCourse) redirect("/courses");

  const isKids = mode === "kids";
  const active = userProgress.activeCourseId;
  const course = (slug: string) => courses.find((c) => c.slug === slug);
  const exams = course(`quran-juz-exams-${locale}`);
  const lessons = isKids
    ? course(`kids-short-surahs-${locale}`)
    : course(`quran-full-${locale}`);

  // A mode that is a course: open it, switching to it if needed.
  const open = (courseId: number | undefined) =>
    courseId === undefined || courseId === active
      ? { href: "/learn" }
      : { courseId };

  const modes: Mode[] = [
    {
      key: "memorise",
      // From the exams, back to the lessons; else the course already open.
      ...(active === exams?.id ? open(lessons?.id) : { href: "/learn" }),
    },
    { key: "read", href: "/read" },
    { key: "review", href: "/lesson/daily", disabled: review.due === 0 },
    // Kids mode has no exams.
    ...(!isKids && exams ? [{ key: "exams", ...open(exams.id) } as const] : []),
  ];

  return <ModeCards modes={modes} />;
};

export default ModesPage;
