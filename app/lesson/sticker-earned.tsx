"use client";

import Link from "next/link";

import { useMessages } from "@/components/locale-provider";
import { Sticker } from "@/components/sticker";
import { type Sticker as StickerData } from "@/lib/stickers";

// Kids mode, a lesson finished: its sticker pops in, and the album is one
// tap away. A lesson done before keeps the sticker it already gave.
export const StickerEarned = ({
  sticker,
  already,
}: {
  sticker: StickerData;
  already: boolean;
}) => {
  const t = useMessages();

  return (
    <div className="flex flex-col items-center gap-y-2">
      <Sticker
        design={sticker.design}
        colour={sticker.colour}
        pop={!already}
        className="h-28 w-28"
      />
      <p className="font-bold text-gold-700">
        {already ? t.stickers.already : t.stickers.earned}
      </p>
      <Link
        href="/stickers"
        className="text-sm font-bold text-brand-500 hover:underline"
      >
        {t.stickers.open}
      </Link>
    </div>
  );
};
