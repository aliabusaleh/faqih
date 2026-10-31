"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { BookOpen, Check, Play, Volume2 } from "lucide-react";

import { useLocale, useMessages } from "@/components/locale-provider";
import { type Step, useReadAloud } from "@/components/read-aloud";
import { Button } from "@/components/ui/button";
import { type sourceTexts } from "@/db/schema";
import { formatNumber } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type SourceText = typeof sourceTexts.$inferSelect;

type StudyProps = {
  texts: SourceText[];
  onStart: () => void;
  /** The questions open once each text is heard, or had time to be read. */
  requireReading?: boolean;
  /** E.g. "Part 2 of 3", for a lesson in parts. */
  partLabel?: string;
  /** The button's text, if not "Start the questions". */
  startLabel?: string;
};

// Time to read a screen before its questions open, without listening.
const MS_PER_WORD = 500;
const MIN_READ_MS = 5_000;
const MAX_READ_MS = 30_000;

// "quran:2:255" -> "2:255", else null.
const ayahRef = (key: string) => /^quran:(\d+:\d+)$/.exec(key)?.[1] ?? null;

// What one text sounds like: an ayah is recited by a qari (never a
// synthetic voice); a dhikr plays its own recording; a hadith has none.
const stepFor = (text: SourceText): Step | null => {
  const ref = ayahRef(text.key);
  if (ref) return { kind: "recite", ref };
  if (text.audioSrc) return { kind: "audio", urls: [text.audioSrc] };
  return null;
};

// "Read first": the ayat (or hadith, adhkar) a lesson is about, shown before
// its questions, so learners answer from what they've just read and heard
// instead of guessing.
export const Study = ({
  texts,
  onStart,
  requireReading = false,
  partLabel,
  startLabel,
}: StudyProps) => {
  const t = useMessages();
  const locale = useLocale();
  const ar = locale === "ar";
  const { enabled, play, preload } = useReadAloud();

  // Read, then answer: the texts heard to the end so far, and the seconds
  // left to read them all (shown on the Start button as a countdown).
  const [heard, setHeard] = useState<ReadonlySet<string>>(new Set());
  const readMs = useMemo(() => {
    if (!requireReading) return 0;
    const words = texts
      .map((text) => text.arabic.split(/\s+/).length)
      .reduce((a, b) => a + b, 0);
    return Math.min(MAX_READ_MS, Math.max(MIN_READ_MS, words * MS_PER_WORD));
  }, [requireReading, texts]);
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.ceil(readMs / 1000)
  );
  useEffect(() => {
    if (!readMs) return;
    const end = Date.now() + readMs;
    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setSecondsLeft(left);
      if (!left) clearInterval(timer);
    }, 250);
    return () => clearInterval(timer);
  }, [readMs]);
  const ready = secondsLeft === 0 || texts.every((text) => heard.has(text.key));

  // A text's sound, then a mark that it was heard to the end (a step that
  // only runs if nothing stopped the one before it).
  const listen = useCallback((text: SourceText): Step[] => {
    const step = stepFor(text);
    return step
      ? [
          step,
          {
            kind: "wait",
            ms: 0,
            onStart: () => setHeard((prev) => new Set(prev).add(text.key)),
          },
        ]
      : [];
  }, []);

  const playAll = useMemo(
    () =>
      texts
        .map(listen)
        .filter((steps) => steps.length > 0)
        .flatMap((steps, i) =>
          i ? [{ kind: "wait", ms: 400 } as Step, ...steps] : steps
        ),
    [listen, texts]
  );

  // Start downloading the recitations, so "Listen to all" starts quickly.
  useEffect(() => {
    preload(
      texts.map((t) => ayahRef(t.key)).filter((r): r is string => r !== null)
    );
  }, [preload, texts]);

  // With read-aloud on (kids by default), recite them all straight away.
  useEffect(() => {
    if (enabled && playAll.length) play(playAll);
  }, [enabled, play, playAll]);

  return (
    <div className="flex w-full flex-col gap-y-6 px-6 lg:w-[600px] lg:px-0">
      <div className="flex items-center justify-between gap-x-3">
        <h1 className="flex items-center gap-x-2 text-lg font-bold text-neutral-700 lg:text-3xl">
          <BookOpen className="h-7 w-7 shrink-0 text-brand-600" />
          {t.study.title}
          {partLabel && (
            <span className="text-base font-normal text-neutral-500 lg:text-xl">
              · {partLabel}
            </span>
          )}
        </h1>
        {playAll.length > 0 && (
          <Button
            variant="secondaryOutline"
            onClick={() => play(playAll)}
            className="shrink-0"
          >
            <Play className="me-2 h-4 w-4" />
            {t.study.playAll}
          </Button>
        )}
      </div>
      <p className="text-neutral-500">{t.study.intro}</p>

      <ol className="flex flex-col gap-y-3">
        {texts.map((text) => {
          const ref = ayahRef(text.key);
          const number = ref ? Number(ref.split(":")[1]) : null;
          const step = stepFor(text);
          // Always the Arabic; in English mode the meaning goes under it.
          const body = text.arabic;
          return (
            <li
              key={text.key}
              className="flex items-start gap-x-3 rounded-xl border-2 p-4"
            >
              <div className="flex-1">
                <p
                  dir="rtl"
                  className={cn(
                    "text-neutral-700",
                    ref
                      ? "font-quran text-2xl leading-[2.4]"
                      : "font-arabic text-lg leading-loose"
                  )}
                >
                  {body}
                  {number !== null && (
                    <span className="ms-1 text-gold-600">
                      ﴿{formatNumber("ar", number)}﴾
                    </span>
                  )}
                </p>
                {/* English mode: the meaning under the Arabic. */}
                {!ar && text.translation && (
                  <p
                    dir="ltr"
                    className="mt-1 text-sm leading-relaxed text-neutral-500"
                  >
                    {number !== null && (
                      <span className="me-1 font-bold">({number})</span>
                    )}
                    {text.translation}
                  </p>
                )}
                {/* Hadith and adhkar: everything their questions ask about,
                    i.e. the number, who recorded it, how many times it is said. */}
                {!ref && (
                  <span className="mt-2 block text-sm text-neutral-500">
                    {[
                      ar ? (text.citationAr ?? text.citation) : text.citation,
                      text.kind === "hadith" &&
                        ((ar ? text.hadithRefAr : text.hadithRef) ??
                          t.source.referencePending),
                      text.kind === "dhikr" &&
                        text.repeat &&
                        t.study.repeat(
                          text.repeat,
                          formatNumber(locale, text.repeat)
                        ),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
              </div>
              {step && (
                <button
                  type="button"
                  onClick={() => play(listen(text))}
                  aria-label={t.lesson.play}
                  className={cn(
                    "shrink-0 rounded-xl border-2 border-b-4 p-2 text-brand-500 hover:bg-black/5 active:border-b-2",
                    heard.has(text.key) && "border-gold-400 text-gold-700"
                  )}
                >
                  {heard.has(text.key) ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </button>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mb-8 flex flex-col gap-y-2">
        {!ready && (
          <p className="text-center text-sm text-neutral-500">
            {t.study.listenFirst}
          </p>
        )}
        <Button
          size="lg"
          variant="secondary"
          onClick={onStart}
          disabled={!ready}
        >
          {ready
            ? (startLabel ?? t.study.start)
            : t.study.startIn(
                startLabel ?? t.study.start,
                formatNumber(locale, secondsLeft)
              )}
        </Button>
      </div>
    </div>
  );
};
