import { getCourses, getUserProgress } from "@/db/queries";
import { getMessages } from "@/lib/locale";

import { List } from "./list";

// Only one track's courses (the kids course counts as Quran). An unknown
// track, or one with nothing in this language and mode, shows them all.
const forTrack = <C extends { track: string | null }>(
  courses: C[],
  track: string | undefined
) => {
  if (!track) return courses;
  const matching = courses.filter(
    (c) => c.track === track || (track === "quran" && c.track === "kids")
  );
  return matching.length ? matching : courses;
};

type CoursesPageProps = {
  // ?track=quran: from the track links on the home page.
  searchParams: Promise<{ track?: string }>;
};

const CoursesPage = async ({ searchParams }: CoursesPageProps) => {
  const { track } = await searchParams;
  const coursesData = getCourses();
  const userProgressData = getUserProgress();

  const [courses, userProgress, t] = await Promise.all([
    coursesData,
    userProgressData,
    getMessages(),
  ]);

  return (
    <div className="mx-auto h-full max-w-[912px] px-3">
      <h1 className="text-2xl font-bold text-neutral-700">{t.courses.title}</h1>
      <p className="mt-1 text-neutral-500">{t.courses.subtitle}</p>

      <List
        courses={forTrack(courses, track)}
        activeCourseId={userProgress?.activeCourseId}
      />
    </div>
  );
};

export default CoursesPage;
