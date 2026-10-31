"use client";

import {
  Baby,
  BookOpen,
  Check,
  Compass,
  Languages,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { useLocale, useMessages } from "@/components/locale-provider";
import { useMode } from "@/components/mode-provider";
import { useReadAloud } from "@/components/read-aloud";
import { Button } from "@/components/ui/button";
import { LOCALES, LOCALE_COOKIE, messages } from "@/lib/i18n";
import {
  MODE_COOKIE,
  type Mode,
  READ_ALOUD_COOKIE,
  TOUR_COOKIE,
  clearPreferenceCookie,
  setPreferenceCookie,
} from "@/lib/mode";
import { cn } from "@/lib/utils";

import { OfflineSettings } from "./offline-settings";
import { ReminderSettings } from "./reminder-settings";

const Choice = ({
  selected,
  onClick,
  icon: Icon,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  icon: typeof Baby;
  title: string;
  description?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    className={cn(
      "flex w-full items-start gap-x-4 rounded-xl border-2 border-b-4 p-4 text-start hover:bg-black/5",
      selected && "border-brand-300 bg-brand-100 hover:bg-brand-100"
    )}
  >
    <Icon className="mt-1 h-6 w-6 shrink-0 text-brand-500" />
    <div className="flex-1">
      <p className="font-bold text-neutral-700">{title}</p>
      {description && <p className="text-sm text-neutral-500">{description}</p>}
    </div>
    {selected && <Check className="h-5 w-5 text-brand-500" />}
  </button>
);

export const SettingsForm = () => {
  const router = useRouter();
  const t = useMessages();
  const locale = useLocale();
  const mode = useMode();
  const readAloud = useReadAloud().enabled;

  const setReadAloud = (on: boolean) => {
    setPreferenceCookie(READ_ALOUD_COOKIE, on ? "1" : "0");
    router.refresh();
  };

  const setMode = (next: Mode) => {
    setPreferenceCookie(MODE_COOKIE, next);
    // The active course may not belong to the new mode: let /learn decide.
    router.push("/learn");
    router.refresh();
  };

  return (
    <div className="flex w-full flex-col gap-y-8">
      <section className="flex flex-col gap-y-3">
        <h2 className="text-lg font-bold text-neutral-700">
          {t.settings.mode}
        </h2>
        <Choice
          selected={mode === "kids"}
          onClick={() => setMode("kids")}
          icon={Baby}
          title={t.settings.kids}
          description={t.settings.kidsDescription}
        />
        <Choice
          selected={mode === "full"}
          onClick={() => setMode("full")}
          icon={BookOpen}
          title={t.settings.full}
          description={t.settings.fullDescription}
        />
      </section>

      <section className="flex flex-col gap-y-3">
        <h2 className="text-lg font-bold text-neutral-700">
          {t.settings.readAloud}
        </h2>
        <Choice
          selected={readAloud}
          onClick={() => setReadAloud(true)}
          icon={Volume2}
          title={t.settings.readAloudOn}
          description={t.settings.readAloudDescription}
        />
        <Choice
          selected={!readAloud}
          onClick={() => setReadAloud(false)}
          icon={VolumeX}
          title={t.settings.readAloudOff}
        />
      </section>

      <ReminderSettings />
      <OfflineSettings />

      <section className="flex flex-col gap-y-3">
        <h2 className="text-lg font-bold text-neutral-700">
          {t.settings.language}
        </h2>
        {LOCALES.map((l) => (
          <Choice
            key={l}
            selected={locale === l}
            onClick={() => {
              setPreferenceCookie(LOCALE_COOKIE, l);
              router.refresh();
            }}
            icon={Languages}
            title={messages[l].language.name}
          />
        ))}
      </section>

      <Button
        variant="secondaryOutline"
        className="self-start"
        onClick={() => {
          clearPreferenceCookie(TOUR_COOKIE);
          router.refresh();
        }}
      >
        <Compass className="me-2 h-5 w-5" />
        {t.settings.tour}
      </Button>
    </div>
  );
};
