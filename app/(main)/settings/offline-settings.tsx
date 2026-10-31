"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { CloudDownload, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useLocale, useMessages } from "@/components/locale-provider";
import { formatNumber } from "@/lib/i18n";
import {
  OFFLINE_CHOICES,
  type OfflineMeta,
  type OfflinePack,
  type OfflineProgress,
  downloadOffline,
  downloadQuran,
  getOfflineMeta,
  offlineSupported,
  removeOffline,
} from "@/lib/offline";
import { cn } from "@/lib/utils";

const noSubscription = () => () => undefined;

const BUTTON =
  "flex items-center gap-x-2 rounded-xl border-2 border-b-4 px-4 py-3 font-bold hover:bg-black/5 disabled:opacity-50";

// A download (lib/offline): its progress, what is saved, and buttons to
// download it (again) or remove it.
const usePack = (pack: OfflinePack) => {
  const t = useMessages();
  const [meta, setMeta] = useState<OfflineMeta | null>(null);
  const [progress, setProgress] = useState<OfflineProgress | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setMeta(getOfflineMeta(pack)), [pack]);

  const download = async (
    run: (onProgress: typeof setProgress) => Promise<OfflineMeta>
  ) => {
    setBusy(true);
    try {
      setMeta(await run(setProgress));
      toast.success(t.offline.saved);
    } catch {
      toast.error(t.offline.failed);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await removeOffline(pack);
      setMeta(null);
      toast.success(t.offline.removed);
    } catch {
      toast.error(t.lesson.error);
    } finally {
      setBusy(false);
    }
  };

  return { meta, progress, busy, download, remove };
};

const useSize = () => {
  const t = useMessages();
  const locale = useLocale();
  return (bytes: number) =>
    t.offline.mb(
      formatNumber(locale, Math.max(0.1, Math.round(bytes / 100_000) / 10))
    );
};

const Progress = ({ progress }: { progress: OfflineProgress }) => {
  const t = useMessages();
  const locale = useLocale();
  const size = useSize();
  return (
    <div className="flex flex-col gap-y-1" aria-live="polite">
      <div className="h-3 overflow-hidden rounded-full bg-neutral-200">
        <div
          className="h-full rounded-full bg-brand-500 transition-all"
          style={{
            width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
          }}
        />
      </div>
      <p className="text-sm text-neutral-500">
        {t.offline.downloading(
          formatNumber(locale, progress.done),
          formatNumber(locale, progress.total)
        )}{" "}
        ({size(progress.bytes)})
      </p>
    </div>
  );
};

const Ready = ({ children }: { children: React.ReactNode }) => (
  <p className="rounded-xl border-2 border-brand-300 bg-brand-100 p-4 text-sm text-brand-600">
    {children}
  </p>
);

// The next few lessons, text only unless the learner also asks for the
// recitation.
const LessonsDownload = () => {
  const t = useMessages();
  const locale = useLocale();
  const size = useSize();
  const { meta, progress, busy, download, remove } = usePack("lessons");
  const [count, setCount] = useState<number>(OFFLINE_CHOICES[0]);
  const [audio, setAudio] = useState(false);

  // Once loaded, show the choices of the saved download.
  const [shown, setShown] = useState(meta);
  if (meta !== shown) {
    setShown(meta);
    if (meta) {
      setAudio(meta.audio);
      const n = meta.lessons.length;
      setCount(OFFLINE_CHOICES.find((c) => c >= n) ?? OFFLINE_CHOICES[0]);
    }
  }

  return (
    <div className="flex flex-col gap-y-3">
      <h3 className="font-bold text-neutral-700">{t.offline.lessons}</h3>
      <div className="flex flex-wrap gap-2">
        {OFFLINE_CHOICES.map((n) => (
          <button
            key={n}
            type="button"
            disabled={busy}
            aria-pressed={count === n}
            onClick={() => setCount(n)}
            className={cn(
              "rounded-xl border-2 border-b-4 px-4 py-2 font-bold text-neutral-700 hover:bg-black/5 disabled:opacity-50",
              count === n && "border-brand-300 bg-brand-100 text-brand-600"
            )}
          >
            {t.offline.lessonsCount(n, formatNumber(locale, n))}
          </button>
        ))}
      </div>

      <label className="flex items-start gap-x-3">
        <input
          type="checkbox"
          checked={audio}
          disabled={busy}
          onChange={(e) => setAudio(e.target.checked)}
          className="mt-1 h-5 w-5 shrink-0 accent-brand-500"
        />
        <span>
          <span className="block font-bold text-neutral-700">
            {t.offline.audio}
          </span>
          <span className="block text-sm text-neutral-500">
            {t.offline.audioDescription}
          </span>
        </span>
      </label>

      {progress && <Progress progress={progress} />}

      {meta && !progress && (
        <Ready>
          {t.offline.ready(
            formatNumber(locale, meta.lessons.length),
            size(meta.bytes)
          )}{" "}
          {meta.audio ? t.offline.withAudio : t.offline.textOnly}
        </Ready>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            download((onProgress) =>
              downloadOffline({ count, audio, onProgress })
            )
          }
          className={cn(BUTTON, "text-neutral-700")}
        >
          <CloudDownload className="h-5 w-5" />
          {meta ? t.offline.again : t.offline.download}
        </button>
        {meta && (
          <button
            type="button"
            disabled={busy}
            onClick={remove}
            className={cn(BUTTON, "text-rose-600")}
          >
            <Trash2 className="h-5 w-5" />
            {t.offline.remove}
          </button>
        )}
      </div>
    </div>
  );
};

// The whole Quran in Read mode, to read with no connection (text only).
const QuranDownload = () => {
  const t = useMessages();
  const size = useSize();
  const { meta, progress, busy, download, remove } = usePack("quran");

  return (
    <div className="flex flex-col gap-y-3">
      <h3 className="font-bold text-neutral-700">{t.offline.quranTitle}</h3>
      <p className="text-sm text-neutral-500">{t.offline.quranDescription}</p>

      {progress && <Progress progress={progress} />}

      {meta && !progress && (
        <Ready>{t.offline.quranReady(size(meta.bytes))}</Ready>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => download(downloadQuran)}
          className={cn(BUTTON, "text-neutral-700")}
        >
          <CloudDownload className="h-5 w-5" />
          {meta ? t.offline.again : t.offline.quranDownload}
        </button>
        {meta && (
          <button
            type="button"
            disabled={busy}
            onClick={remove}
            className={cn(BUTTON, "text-rose-600")}
          >
            <Trash2 className="h-5 w-5" />
            {t.offline.quranRemove}
          </button>
        )}
      </div>
    </div>
  );
};

// "Use offline": nothing is downloaded until the learner asks.
export const OfflineSettings = () => {
  const t = useMessages();
  // Known only in the browser; assumed while the page is drawn on the server.
  const supported = useSyncExternalStore(
    noSubscription,
    offlineSupported,
    () => true
  );

  return (
    <section className="flex flex-col gap-y-3">
      <h2 className="text-lg font-bold text-neutral-700">{t.offline.title}</h2>
      <p className="text-sm text-neutral-500">{t.offline.description}</p>

      {!supported ? (
        <p className="rounded-xl border-2 bg-amber-50 p-4 text-sm text-amber-700">
          {t.offline.unsupported}
        </p>
      ) : (
        <>
          <LessonsDownload />
          <QuranDownload />
        </>
      )}
    </section>
  );
};
