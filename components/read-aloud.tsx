"use client";

import {
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useLocale } from "@/components/locale-provider";
import { useMode } from "@/components/mode-provider";
import { type Locale } from "@/lib/i18n";
import { REPEAT_COOKIE, setPreferenceCookie } from "@/lib/mode";
import { recitationAudio } from "@/lib/recitation";

// One sound at a time for the whole lesson: starting something new stops
// whatever was playing, so prompts, recitations and taps never overlap.
//
// Adab: Quran text never goes to `speak`. Ayat and their words are only
// played as recitation (`recite`, lib/recitation). `speak` is for the app's
// own words: instructions, "أحسنت!", and non-Arabic text like English
// meanings.

export type Step = (
  | { kind: "speak"; text: string }
  | { kind: "recite"; ref: string }
  | { kind: "audio"; urls: string[]; rate?: number }
  | { kind: "wait"; ms: number }
) & {
  /** Called as the step starts, e.g. to highlight the ayah being recited. */
  onStart?: () => void;
};

type ReadAloud = {
  /** Read-aloud is on (Settings; on by default in kids mode). */
  enabled: boolean;
  /**
   * Kids mode: how many times an ayah is heard in a row, on Read first and
   * in listening questions (components/repeat-picker). 1 otherwise.
   */
  repeat: number;
  /** Changes `repeat`, remembered on this device. */
  setRepeat: (times: number) => void;
  /** Play steps in order, stopping anything already playing. */
  play: (steps: Step[]) => void;
  stop: () => void;
  /** Start downloading audio that is likely to play soon (best source). */
  preload: (refs: string[]) => void;
};

const ReadAloudContext = createContext<ReadAloud>({
  enabled: false,
  repeat: 1,
  setRepeat: () => undefined,
  play: () => undefined,
  stop: () => undefined,
  preload: () => undefined,
});

const SPEECH_LANG: Record<Locale, string> = { ar: "ar", en: "en" };
const VOICES_TIMEOUT_MS = 1000;
// A source that hasn't started playing by then is skipped for the next one:
// a stalled request otherwise waits silently forever. Healthy hosts start in
// about a second.
const LOAD_TIMEOUT_MS = 4000;
const MAX_PRELOADED = 12;
// Between two plays of the same ayah, so the child hears where it ends.
const REPEAT_PAUSE_MS = 700;

/** `step` played `times` times in a row, with a short pause in between. */
export const repeated = (step: Step, times: number): Step[] =>
  Array.from({ length: Math.max(1, times) }, (_, i) =>
    i ? [{ kind: "wait", ms: REPEAT_PAUSE_MS } as Step, step] : [step]
  ).flat();

// A voice for the language, or null. Without a matching voice the browser
// would read Arabic with an English voice, so then we say nothing.
const findVoice = async (lang: string) => {
  if (typeof window === "undefined" || !("speechSynthesis" in window))
    return null;
  const pick = () =>
    window.speechSynthesis
      .getVoices()
      .find((v) => v.lang.toLowerCase().startsWith(lang)) ?? null;
  if (window.speechSynthesis.getVoices().length > 0) return pick();
  // Voices load asynchronously on some browsers.
  await new Promise<void>((resolve) => {
    const done = () => resolve();
    window.speechSynthesis.addEventListener("voiceschanged", done, {
      once: true,
    });
    setTimeout(done, VOICES_TIMEOUT_MS);
  });
  return pick();
};

export const ReadAloudProvider = ({
  enabled,
  repeat: initialRepeat,
  children,
}: PropsWithChildren<{ enabled: boolean; repeat: number }>) => {
  const locale = useLocale();
  const mode = useMode();
  const [repeat, setRepeatState] = useState(initialRepeat);
  // A new count from the server (e.g. after switching mode) wins.
  useEffect(() => setRepeatState(initialRepeat), [initialRepeat]);
  const setRepeat = useCallback((times: number) => {
    setRepeatState(times);
    setPreferenceCookie(REPEAT_COOKIE, String(times));
  }, []);
  const audio = useRef<HTMLAudioElement | null>(null);
  // Bumped on every play/stop, so an older sequence stops at its next step.
  const run = useRef(0);
  // Bumped for every source tried, so a stale timer never stops a newer one.
  const attempt = useRef(0);
  // Audio elements kept alive while they download, by URL (latest few).
  const preloaded = useRef(new Map<string, HTMLAudioElement>());

  const stop = useCallback(() => {
    run.current += 1;
    audio.current?.pause();
    if (typeof window !== "undefined" && "speechSynthesis" in window)
      window.speechSynthesis.cancel();
  }, []);

  // Plays one source to the end. "failed": it errored or never started.
  const playSource = useCallback(
    (url: string, rate: number) =>
      new Promise<"ended" | "failed" | "blocked">((resolve) => {
        audio.current ??= new Audio();
        const el = audio.current;
        const id = ++attempt.current;
        const finish = (result: "ended" | "failed" | "blocked") => {
          clearTimeout(timer);
          if (attempt.current === id) {
            el.onplaying = el.onended = el.onerror = null;
            if (result === "failed") el.pause();
          }
          resolve(result);
        };
        const timer = setTimeout(() => finish("failed"), LOAD_TIMEOUT_MS);
        el.onplaying = () => clearTimeout(timer);
        el.onended = () => finish("ended");
        el.onerror = () => finish("failed");
        el.src = url;
        el.defaultPlaybackRate = rate;
        el.playbackRate = rate;
        el.play().catch((error: unknown) =>
          // Autoplay blocked before the first tap: don't try other sources.
          finish(
            error instanceof DOMException && error.name === "NotAllowedError"
              ? "blocked"
              : "failed"
          )
        );
      }),
    []
  );

  // Tries each source in turn (best first) until one plays.
  const playUrls = useCallback(
    async (urls: string[], rate: number, isCurrent: () => boolean) => {
      for (const url of urls) {
        if (!isCurrent()) return;
        if ((await playSource(url, rate)) !== "failed") return;
      }
    },
    [playSource]
  );

  const speak = useCallback(
    async (text: string) => {
      const voice = await findVoice(SPEECH_LANG[locale]);
      if (!voice) return;
      await new Promise<void>((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = voice;
        utterance.lang = voice.lang;
        utterance.rate = mode === "kids" ? 0.9 : 1;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      });
    },
    [locale, mode]
  );

  const play = useCallback(
    (steps: Step[]) => {
      stop();
      const id = run.current;
      void (async () => {
        for (const step of steps) {
          if (run.current !== id) return;
          const isCurrent = () => run.current === id;
          step.onStart?.();
          if (step.kind === "speak") await speak(step.text);
          else if (step.kind === "recite")
            await playUrls(recitationAudio(step.ref, mode), 1, isCurrent);
          else if (step.kind === "audio")
            await playUrls(step.urls, step.rate ?? 1, isCurrent);
          else await new Promise((r) => setTimeout(r, step.ms));
        }
      })();
    },
    [mode, playUrls, speak, stop]
  );

  // Leaving the lesson stops the sound.
  useEffect(() => stop, [stop]);

  const preload = useCallback(
    (refs: string[]) => {
      for (const ref of refs) {
        const [url] = recitationAudio(ref, mode);
        if (!url || preloaded.current.has(url)) continue;
        const el = new Audio();
        el.preload = "auto";
        el.src = url;
        preloaded.current.set(url, el);
      }
      // Keep only the most recent ones.
      for (const url of [...preloaded.current.keys()].slice(0, -MAX_PRELOADED))
        preloaded.current.delete(url);
    },
    [mode]
  );

  const value = useMemo(
    () => ({ enabled, repeat, setRepeat, play, stop, preload }),
    [enabled, repeat, setRepeat, play, stop, preload]
  );

  return (
    <ReadAloudContext.Provider value={value}>
      {children}
    </ReadAloudContext.Provider>
  );
};

export const useReadAloud = () => useContext(ReadAloudContext);

/** Whether the app may read this text with a synthetic voice. */
export const isSpeakable = (text: string) =>
  // Arabic in lessons is Quran, hadith or dhikr: never synthesised. Digits
  // and the app's own short words (صح / خطأ) are the exception.
  !/[\u0600-\u06FF]/.test(text) ||
  /^[\s\d\u0660-\u0669]+$/.test(text) ||
  text === "صح" ||
  text === "خطأ";
