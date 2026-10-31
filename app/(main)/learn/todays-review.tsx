import { CheckCircle2, RotateCcw } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/i18n";
import { getLocale, getMessages } from "@/lib/locale";

type TodaysReviewProps = {
  /** Questions due today (at most a day's review). */
  due: number;
  /** Today's review was already done. */
  doneToday: boolean;
};

// Today's review: a few questions on what was memorised, due today
// (lib/review.ts), next to today's wird. Once done, it says so until
// tomorrow.
export const TodaysReview = async ({ due, doneToday }: TodaysReviewProps) => {
  if (due === 0 && !doneToday) return null;
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);

  return (
    <div className="mb-8 flex w-full items-center justify-between gap-x-4 rounded-xl border-2 border-b-4 p-4">
      <div className="flex items-center gap-x-3">
        {due > 0 ? (
          <RotateCcw className="h-8 w-8 shrink-0 text-brand-500" />
        ) : (
          <CheckCircle2 className="h-8 w-8 shrink-0 text-green-500" />
        )}
        <div>
          <p className="font-bold text-neutral-700">{t.daily.title}</p>
          <p className="text-sm text-neutral-500">
            {due > 0
              ? t.daily.due(due, formatNumber(locale, due))
              : t.daily.doneToday}
          </p>
        </div>
      </div>
      {due > 0 && (
        <Link href="/lesson/daily">
          <Button variant="secondary" className="shrink-0">
            {t.daily.start}
          </Button>
        </Link>
      )}
    </div>
  );
};
