import { useCallback, useRef } from "react";

import Image from "next/image";
import { useKey } from "react-use";

import { Meaning } from "@/components/meanings";
import { useIsKids } from "@/components/mode-provider";
import { useQuranText } from "@/components/quran-text";
import { isSpeakable, useReadAloud } from "@/components/read-aloud";
import { challenges } from "@/db/schema";
import { LIST_TYPES } from "@/lib/exercises";
import { cn, isArabic } from "@/lib/utils";

type CardProps = {
  id: number;
  text: string;
  imageSrc: string | null;
  audioSrc: string | null;
  /** Ayah ("s:a") or word ("s:a:w") recited when tapped (lib/recitation). */
  recitation?: string | null;
  /** English mode: the meaning shown under an Arabic ayah. */
  meaning?: string;
  shortcut: string;
  selected?: boolean;
  onClick: () => void;
  status?: "correct" | "wrong" | "none";
  disabled?: boolean;
  type: (typeof challenges.$inferSelect)["type"];
};

export const Card = ({
  text,
  imageSrc,
  audioSrc,
  recitation,
  meaning,
  shortcut,
  selected,
  onClick,
  status,
  disabled,
  type,
}: CardProps) => {
  // Most options have no audio: only render an <audio> element when they do.
  const audioRef = useRef<HTMLAudioElement>(null);
  const isList = LIST_TYPES.includes(type);
  const isKids = useIsKids();
  const quran = useQuranText();
  const readAloud = useReadAloud();

  const handleClick = useCallback(() => {
    if (disabled) return;

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      void audioRef.current.play().catch(() => {});
    } else if (readAloud.enabled) {
      // Quran is recited; only the app's own words are spoken.
      if (recitation) readAloud.play([{ kind: "recite", ref: recitation }]);
      else if (isSpeakable(text)) readAloud.play([{ kind: "speak", text }]);
    }
    onClick();
  }, [disabled, onClick, readAloud, recitation, text]);

  useKey(shortcut, handleClick, {}, [handleClick]);

  return (
    <div
      onClick={handleClick}
      className={cn(
        "h-full cursor-pointer rounded-xl border-2 border-b-4 p-4 hover:bg-black/5 active:border-b-2 lg:p-6",
        selected && "border-brand-300 bg-brand-100 hover:bg-brand-100",
        selected &&
          status === "correct" &&
          "border-green-300 bg-green-100 hover:bg-green-100",
        selected &&
          status === "wrong" &&
          "border-rose-300 bg-rose-100 hover:bg-rose-100",
        disabled && "pointer-events-none hover:bg-white",
        isList && "w-full lg:p-3",
        isKids && "p-6 lg:p-8"
      )}
    >
      {audioSrc && <audio ref={audioRef} src={audioSrc} preload="auto" />}
      {imageSrc && (
        <div className="relative mb-4 aspect-square max-h-[80px] w-full lg:max-h-[150px]">
          <Image src={imageSrc} fill alt={text} />
        </div>
      )}

      <div
        className={cn(
          "flex items-center justify-between",
          isList && "flex-row-reverse"
        )}
      >
        {isList && <div aria-hidden />}
        <p
          dir="auto"
          className={cn(
            "text-sm text-neutral-600 lg:text-base",
            isArabic(text) &&
              (quran
                ? "font-quran text-xl leading-[2.4] lg:text-2xl"
                : "font-arabic text-lg leading-loose lg:text-xl"),
            isKids && "text-xl lg:text-2xl",
            selected && "text-brand-500",
            selected && status === "correct" && "text-green-500",
            selected && status === "wrong" && "text-rose-500"
          )}
        >
          {text}
          <Meaning text={meaning} />
        </p>

        {/* Keyboard shortcuts mean nothing to young kids: hide them. */}
        <div
          hidden={isKids}
          className={cn(
            "flex h-[20px] w-[20px] items-center justify-center rounded-lg border-2 text-xs font-semibold text-neutral-400 lg:h-[30px] lg:w-[30px] lg:text-[15px]",
            selected && "border-brand-300 text-brand-500",
            selected &&
              status === "correct" &&
              "border-green-500 text-green-500",
            selected && status === "wrong" && "border-rose-500 text-rose-500"
          )}
        >
          {shortcut}
        </div>
      </div>
    </div>
  );
};
