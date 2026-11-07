"use client";

import { Repeat } from "lucide-react";

import { useLocale, useMessages } from "@/components/locale-provider";
import { useIsKids } from "@/components/mode-provider";
import { useReadAloud } from "@/components/read-aloud";
import { formatNumber } from "@/lib/i18n";
import { REPEAT_TIMES } from "@/lib/mode";
import { cn } from "@/lib/utils";

// Kids mode: hear each ayah 1, 3, 5 or 7 times in a row, for children who
// learn by ear. Shown on Read first and in listening questions; the choice
// is kept on this device.
export const RepeatPicker = ({ className }: { className?: string }) => {
  const t = useMessages();
  const locale = useLocale();
  const isKids = useIsKids();
  const { repeat, setRepeat } = useReadAloud();

  if (!isKids) return null;

  return (
    <div
      role="group"
      aria-label={t.lesson.repeat}
      className={cn("flex items-center justify-center gap-x-2", className)}
    >
      <Repeat className="h-5 w-5 shrink-0 text-brand-500" aria-hidden />
      {REPEAT_TIMES.map((times) => (
        <button
          key={times}
          type="button"
          onClick={() => setRepeat(times)}
          aria-pressed={repeat === times}
          aria-label={t.lesson.repeatTimes(times, formatNumber(locale, times))}
          className={cn(
            "min-w-12 rounded-xl border-2 border-b-4 px-3 py-2 font-bold text-neutral-500 hover:bg-black/5 active:border-b-2",
            repeat === times &&
              "border-brand-300 bg-brand-100 text-brand-600 hover:bg-brand-100"
          )}
        >
          {formatNumber(locale, times)}×
        </button>
      ))}
    </div>
  );
};
