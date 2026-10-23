import Image from "next/image";
import { redirect } from "next/navigation";

import { FeedWrapper } from "@/components/feed-wrapper";
import { Promo } from "@/components/promo";
import { Quests } from "@/components/quests";
import { StickyWrapper } from "@/components/sticky-wrapper";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { UserProgress } from "@/components/user-progress";
import {
  getTopTenUsers,
  getUserProgress,
  getUserSubscription,
} from "@/db/queries";
import { getPublicProfiles } from "@/lib/auth";
import { formatNumber, messages } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getMode } from "@/lib/preferences";

const LeaderboardPage = async () => {
  // Not part of kids mode (no points, hearts or rankings).
  if ((await getMode()) === "kids") redirect("/learn");

  const userProgressData = getUserProgress();
  const userSubscriptionData = getUserSubscription();
  const leaderboardData = getTopTenUsers();

  const [userProgress, userSubscription, leaderboard] = await Promise.all([
    userProgressData,
    userSubscriptionData,
    leaderboardData,
  ]);

  if (!userProgress || !userProgress.activeCourse) redirect("/courses");

  // Show each person's current name and picture, not the ones saved when
  // they first chose a course.
  const profiles = await getPublicProfiles(leaderboard.map((u) => u.userId));

  const isPro = !!userSubscription?.isActive;
  const locale = await getLocale();
  const t = messages[locale];

  return (
    <div className="flex flex-row-reverse gap-[48px] px-6">
      <StickyWrapper>
        <UserProgress
          activeCourse={userProgress.activeCourse}
          hearts={userProgress.hearts}
          points={userProgress.points}
          hasActiveSubscription={isPro}
        />
        {!isPro && <Promo />}
        <Quests points={userProgress.points} />
      </StickyWrapper>

      <FeedWrapper>
        <div className="flex w-full flex-col items-center">
          <Image
            src="/leaderboard.svg"
            alt="Leaderboard"
            height={90}
            width={90}
          />

          <h1 className="my-6 text-center text-2xl font-bold text-neutral-800">
            {t.leaderboard.title}
          </h1>
          <p className="mb-6 text-center text-lg text-muted-foreground">
            {t.leaderboard.description}
          </p>

          <Separator className="mb-4 h-0.5 rounded-full" />
          {leaderboard.map((userProgress, i) => (
            <div
              key={userProgress.userId}
              className="flex w-full items-center rounded-xl p-2 px-4 hover:bg-gray-200/50"
            >
              <p className="me-4 font-bold text-lime-700">
                {formatNumber(locale, i + 1)}
              </p>

              <Avatar className="me-6 ms-3 h-12 w-12 border bg-green-500">
                <AvatarImage
                  src={
                    profiles.get(userProgress.userId)?.imageUrl ??
                    userProgress.userImageSrc
                  }
                  className="object-cover"
                />
              </Avatar>

              <p className="flex-1 font-bold text-neutral-800">
                {profiles.get(userProgress.userId)?.name ??
                  userProgress.userName}
              </p>
              <p className="text-muted-foreground">
                {t.leaderboard.xp(formatNumber(locale, userProgress.points))}
              </p>
            </div>
          ))}
        </div>
      </FeedWrapper>
    </div>
  );
};

export default LeaderboardPage;
