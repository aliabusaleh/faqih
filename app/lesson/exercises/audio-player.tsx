"use client";

import { useEffect } from "react";

import { Snail, Volume2 } from "lucide-react";

import { useMessages } from "@/components/locale-provider";
import { useReadAloud } from "@/components/read-aloud";

const SLOW_RATE = 0.75;

// Plays the ayah's recitation, at normal speed or slowly, for LISTEN. Goes
// through the lesson's sound queue, so it never overlaps other sounds.
export const AudioPlayer = ({ urls }: { urls: string[] }) => {
  const t = useMessages();
  const { enabled, play, stop } = useReadAloud();

  // Play once when a new ayah is shown. With read-aloud on, the lesson
  // already reads the instruction and then plays this ayah.
  useEffect(() => {
    if (!enabled) play([{ kind: "audio", urls }]);
  }, [enabled, play, urls]);

  // Answering before the recitation ends must not carry it into the next
  // question: stop when this player goes away.
  useEffect(() => stop, [stop]);

  return (
    <div className="mb-6 flex items-center justify-center gap-x-4">
      <button
        type="button"
        onClick={() => play([{ kind: "audio", urls }])}
        aria-label={t.lesson.play}
        className="flex h-20 w-20 items-center justify-center rounded-2xl border-b-4 border-brand-600 bg-brand-500 text-white hover:bg-brand-500/90 active:border-b-0"
      >
        <Volume2 className="h-10 w-10" />
      </button>
      <button
        type="button"
        onClick={() => play([{ kind: "audio", urls, rate: SLOW_RATE }])}
        aria-label={t.lesson.playSlow}
        className="flex h-14 w-14 items-center justify-center rounded-2xl border-b-4 border-brand-600 bg-brand-500 text-white hover:bg-brand-500/90 active:border-b-0"
      >
        <Snail className="h-7 w-7" />
      </button>
    </div>
  );
};
