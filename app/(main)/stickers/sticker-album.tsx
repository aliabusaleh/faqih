"use client";

import Image from "next/image";
import Link from "next/link";

import { useLocale, useMessages } from "@/components/locale-provider";
import { Sticker } from "@/components/sticker";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/i18n";
import { type AlbumRow } from "@/lib/stickers";
import { cn } from "@/lib/utils";

type Album = {
  courseId: number;
  title: string;
  rows: AlbumRow[];
  earned: number;
  total: number;
};

// The sticker album: a card per surah, its stickers in lesson order, the
// ones not earned yet as pale outlines. A surah with every sticker gets a
// gold edge.
export const StickerAlbum = ({ albums }: { albums: Album[] }) => {
  const t = useMessages();
  const locale = useLocale();
  const earned = albums.reduce((sum, a) => sum + a.earned, 0);
  const total = albums.reduce((sum, a) => sum + a.total, 0);

  return (
    <div className="flex w-full flex-col items-center">
      <Image src="/stickers.svg" alt="" height={90} width={90} />
      <h1 className="my-4 text-center text-2xl font-bold text-neutral-800">
        {t.stickers.title}
      </h1>
      {total > 0 && (
        <p className="mb-6 text-center text-lg font-bold text-gold-700">
          {t.stickers.count(
            formatNumber(locale, earned),
            formatNumber(locale, total)
          )}
        </p>
      )}

      {earned === 0 && (
        <div className="mb-6 flex flex-col items-center gap-y-3 text-center">
          <p className="text-muted-foreground">{t.stickers.empty}</p>
          <Button asChild variant="secondary">
            <Link href="/learn">{t.stickers.start}</Link>
          </Button>
        </div>
      )}

      <div className="flex w-full flex-col gap-y-6">
        {albums.map((album) => (
          <section key={album.courseId} className="flex flex-col gap-y-3">
            {albums.length > 1 && (
              <h2 className="text-lg font-bold text-neutral-700">
                {album.title}
              </h2>
            )}
            {album.rows.map((row) => {
              const full = row.stickers.every((s) => s.earned);
              return (
                <div
                  key={row.unitId}
                  className={cn(
                    "rounded-xl border-2 border-b-4 p-4",
                    full && "border-gold-400 bg-gold-50"
                  )}
                >
                  <h3 className="mb-3 font-bold text-neutral-700">
                    {row.title}
                  </h3>
                  <ul className="flex flex-wrap gap-3">
                    {row.stickers.map((sticker) => (
                      <li key={sticker.lessonId}>
                        <Sticker
                          design={sticker.design}
                          colour={sticker.colour}
                          earned={sticker.earned}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
};
