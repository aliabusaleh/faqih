import { Flame } from "lucide-react";

import { getUserProgress } from "@/db/queries";
import { getMessages } from "@/lib/locale";
import { getToday } from "@/lib/preferences";
import { currentStreak } from "@/lib/review";
import { cn } from "@/lib/utils";

/** Days in a row with a lesson or the daily review finished. */
export const Streak = async () => {
  const [progress, today, t] = await Promise.all([
    getUserProgress(),
    getToday(),
    getMessages(),
  ]);
  if (!progress) return null;

  const streak = currentStreak(progress, today);

  return (
    <span
      className={cn(
        "flex items-center px-4 font-bold",
        streak > 0 ? "text-gold-700" : "text-neutral-400"
      )}
      title={t.streak.label}
    >
      <Flame
        className={cn(
          "me-2 h-6 w-6",
          streak > 0 ? "fill-gold-400 stroke-gold-600" : "stroke-neutral-400"
        )}
        aria-hidden
      />
      <span className="sr-only">{t.streak.label}: </span>
      {streak}
    </span>
  );
};
