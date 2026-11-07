import { redirect } from "next/navigation";

import { FeedWrapper } from "@/components/feed-wrapper";
import { StickyWrapper } from "@/components/sticky-wrapper";
import { UserProgress } from "@/components/user-progress";
import {
  getStickerAlbum,
  getUserProgress,
  getUserSubscription,
} from "@/db/queries";

import { StickerAlbum } from "./sticker-album";

// Kids mode: the stickers earned so far, a sticker per lesson finished
// (lib/stickers).
const StickersPage = async () => {
  // Only part of kids mode.
  const albums = await getStickerAlbum();
  if (!albums) redirect("/learn");

  const [userProgress, userSubscription] = await Promise.all([
    getUserProgress(),
    getUserSubscription(),
  ]);
  if (!userProgress || !userProgress.activeCourse) redirect("/courses");

  return (
    <div className="flex flex-row-reverse gap-[48px] px-6">
      <StickyWrapper>
        <UserProgress
          activeCourse={userProgress.activeCourse}
          hearts={userProgress.hearts}
          points={userProgress.points}
          hasActiveSubscription={!!userSubscription?.isActive}
        />
      </StickyWrapper>

      <FeedWrapper>
        <StickerAlbum albums={albums} />
      </FeedWrapper>
    </div>
  );
};

export default StickersPage;
