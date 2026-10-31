"use client";

import {
  Fragment,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import Link from "next/link";

import { useLocale, useMessages } from "@/components/locale-provider";
import { type Step, useReadAloud } from "@/components/read-aloud";
import { Button } from "@/components/ui/button";
import { type Passage } from "@/db/queries";
import { formatNumber } from "@/lib/i18n";
import { LAST_READ_COOKIE, setPreferenceCookie } from "@/lib/mode";
import { cn } from "@/lib/utils";

type NavLink = { href: string; label: string } | null;

type ReaderProps = Passage & {
  title: string;
  // "surah/2" or "juz/30": remembered so the read page can continue here.
  path: string;
  previous: NavLink;
  next: NavLink;
};

// Al-Fatiha's basmalah is its first ayah; at-Tawbah has none.
const opensWithBasmalah = (surah: number) => surah !== 1 && surah !== 9;

// Read mode: the ayat as in a mushaf, with their numbers. Tap an ayah to hear
// it recited; "Listen to all" recites from the top (or, while it is playing,
// from the ayah tapped). English adds each ayah's meaning under it: the Quran
// is read in Arabic, the meaning is a help.
export const Reader = ({
  title,
  path,
  basmalah,
  sections,
  previous,
  next,
}: ReaderProps) => {
  const t = useMessages();
  const locale = useLocale();
  const ar = locale === "ar";
  const { play, stop } = useReadAloud();
  const [current, setCurrent] = useState<string | null>(null);
  const [continuous, setContinuous] = useState(false);

  const ayat = useMemo(() => sections.flatMap((s) => s.ayat), [sections]);

  useEffect(() => {
    setPreferenceCookie(LAST_READ_COOKIE, path);
  }, [path]);

  // Leaving the page stops the recitation.
  useEffect(() => stop, [stop]);

  const playFrom = useCallback(
    (index: number, all: boolean) => {
      const chosen = all ? ayat.slice(index) : [ayat[index]];
      const steps: Step[] = chosen.map((ayah) => ({
        kind: "recite",
        ref: ayah.ref,
        onStart: () => {
          setCurrent(ayah.ref);
          if (all)
            document
              .getElementById(`ayah-${ayah.ref}`)
              ?.scrollIntoView({ behavior: "smooth", block: "center" });
        },
      }));
      steps.push({
        kind: "wait",
        ms: 0,
        onStart: () => {
          setCurrent(null);
          setContinuous(false);
        },
      });
      setContinuous(all);
      play(steps);
    },
    [ayat, play]
  );

  const stopAll = () => {
    stop();
    setCurrent(null);
    setContinuous(false);
  };

  const ayahProps = (ref: string, index: number) => ({
    id: `ayah-${ref}`,
    role: "button",
    tabIndex: 0,
    onClick: () => playFrom(index, continuous),
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        playFrom(index, continuous);
      }
    },
  });

  const marker = (n: number) => (
    <span className="mx-1 text-gold-600">﴿{formatNumber(locale, n)}﴾</span>
  );

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-y-6 px-6 pb-16">
      <div className="sticky top-[56px] z-10 flex items-center justify-between gap-x-3 border-b-2 bg-white py-3 lg:top-0">
        <Link href="/read">
          <Button size="sm" variant="ghost" aria-label={t.read.back}>
            <ArrowLeft className="h-5 w-5 stroke-2 text-neutral-400 rtl:rotate-180" />
          </Button>
        </Link>
        <h1
          className={cn(
            "text-lg font-bold text-neutral-700",
            ar && "font-arabic"
          )}
        >
          {title}
        </h1>
        {continuous ? (
          <Button variant="secondaryOutline" size="sm" onClick={stopAll}>
            <Pause className="me-2 h-4 w-4" />
            {t.read.stop}
          </Button>
        ) : (
          <Button
            variant="secondaryOutline"
            size="sm"
            onClick={() => playFrom(0, true)}
            disabled={ayat.length === 0}
          >
            <Play className="me-2 h-4 w-4" />
            {t.read.playAll}
          </Button>
        )}
      </div>

      {ayat.length === 0 ? (
        <p className="rounded-xl border-2 bg-amber-50 p-4 text-sm text-amber-700">
          {t.read.notImported}
        </p>
      ) : (
        <p className="text-center text-sm text-neutral-400">{t.read.tapHint}</p>
      )}

      {sections.map((section) => {
        const offset = ayat.findIndex((a) => a.ref === section.ayat[0]?.ref);
        return (
          <section key={section.surah} className="flex flex-col gap-y-4">
            <div className="rounded-xl border-2 border-brand-200 bg-brand-50 py-3 text-center">
              <h2
                className={cn(
                  "font-bold text-brand-700",
                  ar ? "font-arabic text-xl" : "text-lg"
                )}
              >
                {ar ? section.name : section.englishName}
              </h2>
              {(!ar || !section.fromStart) && (
                <p className="text-sm text-brand-600">
                  {[
                    !ar && section.englishNameTranslation,
                    !section.fromStart &&
                      section.ayat[0] &&
                      t.read.fromAyah(
                        formatNumber(locale, section.ayat[0].number)
                      ),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>

            {section.fromStart &&
              basmalah &&
              opensWithBasmalah(section.surah) && (
                <p
                  dir="rtl"
                  className="text-center font-quran text-2xl text-neutral-700"
                >
                  {basmalah}
                </p>
              )}

            {ar ? (
              // A mushaf page: the ayat run on, each ending with its number.
              <p
                dir="rtl"
                className="text-justify font-quran text-2xl leading-[2.6] text-neutral-700"
              >
                {section.ayat.map((ayah, i) => (
                  <Fragment key={ayah.ref}>
                    <span
                      {...ayahProps(ayah.ref, offset + i)}
                      className={cn(
                        "cursor-pointer rounded-lg px-0.5 hover:bg-brand-50",
                        current === ayah.ref && "bg-brand-100 hover:bg-brand-100"
                      )}
                    >
                      {ayah.arabic}
                      {marker(ayah.number)}
                    </span>{" "}
                  </Fragment>
                ))}
              </p>
            ) : (
              <ol className="flex flex-col gap-y-3">
                {section.ayat.map((ayah, i) => (
                  <li
                    key={ayah.ref}
                    {...ayahProps(ayah.ref, offset + i)}
                    className={cn(
                      "cursor-pointer rounded-xl border-2 p-4 hover:bg-brand-50",
                      current === ayah.ref &&
                        "border-brand-300 bg-brand-100 hover:bg-brand-100"
                    )}
                  >
                    <p
                      dir="rtl"
                      className="font-quran text-2xl leading-[2.4] text-neutral-700"
                    >
                      {ayah.arabic}
                      {marker(ayah.number)}
                    </p>
                    {ayah.translation && (
                      <p
                        dir="ltr"
                        className="mt-2 text-sm leading-relaxed text-neutral-500"
                      >
                        <span className="me-1 font-bold">({ayah.number})</span>
                        {ayah.translation}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        );
      })}

      {(previous || next) && (
        <nav className="flex items-center justify-between gap-x-3">
          {previous ? (
            <Link href={previous.href}>
              <Button variant="primaryOutline" size="sm">
                <ArrowLeft className="me-2 h-4 w-4 rtl:rotate-180" />
                <span className={cn(ar && "font-arabic")}>
                  {previous.label}
                </span>
              </Button>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={next.href}>
              <Button variant="primaryOutline" size="sm">
                <span className={cn(ar && "font-arabic")}>{next.label}</span>
                <ArrowRight className="ms-2 h-4 w-4 rtl:rotate-180" />
              </Button>
            </Link>
          )}
        </nav>
      )}
    </div>
  );
};
