import { getCourses, getUserProgress } from "@/db/queries";
import { getMessages } from "@/lib/locale";

import { List } from "./list";

const CoursesPage = async () => {
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

      <List courses={courses} activeCourseId={userProgress?.activeCourseId} />
    </div>
  );
};

export default CoursesPage;
