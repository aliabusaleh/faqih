import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { QUESTS } from "@/constants";
import { formatNumber, messages } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

type QuestsProps = { points: number };

export const Quests = async ({ points }: QuestsProps) => {
  const locale = await getLocale();
  const t = messages[locale];

  return (
    <div className="space-y-4 rounded-xl border-2 p-4">
      <div className="flex w-full items-center justify-between space-y-2">
        <h3 className="text-lg font-bold">{t.quests.title}</h3>

        <Link href="/quests">
          <Button size="sm" variant="primaryOutline">
            {t.quests.viewAll}
          </Button>
        </Link>
      </div>

      <ul className="w-full space-y-4">
        {QUESTS.map((quest) => {
          const progress = (points / quest.value) * 100;

          return (
            <div
              className="flex w-full items-center gap-x-3 pb-4"
              key={quest.title}
            >
              <Image src="/points.svg" alt="Points" width={40} height={40} />

              <div className="flex w-full flex-col gap-y-2">
                <p className="text-sm font-bold text-neutral-700">
                  {t.quests.earn(formatNumber(locale, quest.value))}
                </p>

                <Progress value={progress} className="h-2" />
              </div>
            </div>
          );
        })}
      </ul>
    </div>
  );
};
