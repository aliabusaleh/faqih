import { redirect } from "next/navigation";

import { FeedWrapper } from "@/components/feed-wrapper";
import { InviteCard } from "@/components/invite";
import { PreloadPage } from "@/components/preload-page";
import { Promo } from "@/components/promo";
import { StickyWrapper } from "@/components/sticky-wrapper";
import { UserProgress } from "@/components/user-progress";
import {
  getCourseProgress,
  getUnits,
  getUserProgress,
  getUserSubscription,
} from "@/db/queries";
import { splitByJuz } from "@/lib/juz";
import { getLastJuz, getLastUnitId, getMode } from "@/lib/preferences";

import { Header } from "./header";
import { JuzPicker } from "./juz-picker";
import { ScrollToUnit } from "./scroll-to-unit";
import { TodaysWird } from "./todays-wird";
import { UnitJump } from "./unit-jump";
import { Unit } from "./unit";

type LearnPageProps = {
  // ?wird=1: opened from the daily reminder. ?juz=n: the juz' to show.
  searchParams: Promise<{ wird?: string; juz?: string }>;
};

const LearnPage = async ({ searchParams }: LearnPageProps) => {
  const params = await searchParams;
  const fromReminder = params.wird === "1";
  const userProgressData = getUserProgress();
  const courseProgressData = getCourseProgress();
  const unitsData = getUnits();
  const userSubscriptionData = getUserSubscription();

  const [
    userProgress,
    units,
    courseProgress,
    userSubscription,
    mode,
    lastUnitId,
    lastJuz,
  ] = await Promise.all([
    userProgressData,
    unitsData,
    courseProgressData,
    userSubscriptionData,
    getMode(),
    getLastUnitId(),
    getLastJuz(),
  ]);
  const isKids = mode === "kids";

  if (!courseProgress || !userProgress || !userProgress.activeCourse)
    redirect("/courses");

  const isPro = !!userSubscription?.isActive;
  const wird = courseProgress.activeLesson;
  const wirdUnit = units.find((u) => u.id === wird?.unitId);

  // The whole Quran is too long for one page: show it one juz' at a time.
  // Which one: the link's, else the last one shown here, else today's wird's.
  const byJuz = splitByJuz(units);
  const hasJuz = (n: number | null): n is number =>
    !!byJuz && byJuz.ajza.some((j) => j.juz === n);
  const wirdJuz = wirdUnit ? (byJuz?.firstJuz(wirdUnit) ?? null) : null;
  const juz =
    [Number(params.juz), lastJuz, wirdJuz].find(hasJuz) ?? byJuz?.ajza[0].juz;
  const shown =
    byJuz && juz
      ? byJuz.unitsIn(juz)
      : units.map((unit) => ({ ...unit, allLessons: unit.lessons }));

  return (
    <div className="flex flex-row-reverse gap-[48px] px-6">
      <StickyWrapper>
        <UserProgress
          activeCourse={userProgress.activeCourse}
          hearts={userProgress.hearts}
          points={userProgress.points}
          hasActiveSubscription={isPro}
          hideHearts={isKids}
        />

        {!isPro && !isKids && <Promo />}
        <InviteCard />
      </StickyWrapper>
      <FeedWrapper>
        <Header
          title={userProgress.activeCourse.title}
          imageSrc={userProgress.activeCourse.imageSrc}
        />
        {/* Today's wird is the likely next tap: have it ready. */}
        {wird && <PreloadPage href={`/lesson/${wird.id}`} />}
        {wird && wirdUnit && (
          <TodaysWird
            lessonId={wird.id}
            unitTitle={wirdUnit.title}
            lessonTitle={wird.title}
            highlight={fromReminder}
          />
        )}
        {/* Back to the surah of the last lesson, not the top of the list. */}
        <ScrollToUnit
          order={units.find((u) => u.id === lastUnitId)?.order ?? null}
        />
        {/* Any surah can be learned in any order: jump straight to one. */}
        {units.length > 1 && (
          <UnitJump
            units={units.map((unit) => ({
              order: unit.order,
              title: unit.title,
              cleared: unit.cleared,
              juz: byJuz?.firstJuz(unit) ?? null,
            }))}
          />
        )}
        {byJuz && juz && <JuzPicker ajza={byJuz.ajza} selected={juz} />}
        {shown.map((unit) => (
          <div
            key={unit.id}
            id={`unit-${unit.order}`}
            className="mb-10 scroll-mt-24"
          >
            <Unit
              title={unit.title}
              description={unit.description}
              lessons={unit.lessons}
              allLessons={unit.allLessons}
              completed={unit.completed}
              passedExam={unit.passedExam}
            />
          </div>
        ))}
      </FeedWrapper>
    </div>
  );
};

export default LearnPage;
