"use client";

import { useEffect, useState } from "react";

import { CloudDownload, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useLocale, useMessages } from "@/components/locale-provider";
import { formatNumber } from "@/lib/i18n";
import {
  OFFLINE_CHOICES,
  type OfflineMeta,
  type OfflineProgress,
  downloadOffline,
  getOfflineMeta,
  offlineSupported,
  removeOffline,
} from "@/lib/offline";
import { cn } from "@/lib/utils";

// "Download for offline": the next few lessons, text only unless the
// learner also asks for the recitation (lib/offline).
export const OfflineSettings = () => {
  const t = useMessages();
  const locale = useLocale();
  const [supported, setSupported] = useState(true);
  const [meta, setMeta] = useState<OfflineMeta | null>(null);
  const [count, setCount] = useState<number>(OFFLINE_CHOICES[0]);
  const [audio, setAudio] = useState(false);
  const [progress, setProgress] = useState<OfflineProgress | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSupported(offlineSupported());
    const saved = getOfflineMeta();
    setMeta(saved);
    if (saved) {
      setAudio(saved.audio);
      const n = saved.lessons.length;
      setCount(OFFLINE_CHOICES.find((c) => c >= n) ?? OFFLINE_CHOICES[0]);
    }
  }, []);

  const size = (bytes: number) =>
    t.offline.mb(
      formatNumber(locale, Math.max(0.1, Math.round(bytes / 100_000) / 10))
    );

  const download = async () => {
    setBusy(true);
    try {
      setMeta(await downloadOffline({ count, audio, onProgress: setProgress }));
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
      await removeOffline();
      setMeta(null);
      toast.success(t.offline.removed);
    } catch {
      toast.error(t.lesson.error);
    } finally {
      setBusy(false);
    }
  };

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
          <div className="flex flex-col gap-y-2">
            <p className="font-bold text-neutral-700">{t.offline.lessons}</p>
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
                    count === n &&
                      "border-brand-300 bg-brand-100 text-brand-600"
                  )}
                >
                  {t.offline.lessonsCount(n, formatNumber(locale, n))}
                </button>
              ))}
            </div>
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

          {progress && (
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
          )}

          {meta && !progress && (
            <p className="rounded-xl border-2 border-brand-300 bg-brand-100 p-4 text-sm text-brand-600">
              {t.offline.ready(
                formatNumber(locale, meta.lessons.length),
                size(meta.bytes)
              )}{" "}
              {meta.audio ? t.offline.withAudio : t.offline.textOnly}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={download}
              className="flex items-center gap-x-2 rounded-xl border-2 border-b-4 px-4 py-3 font-bold text-neutral-700 hover:bg-black/5 disabled:opacity-50"
            >
              <CloudDownload className="h-5 w-5" />
              {meta ? t.offline.again : t.offline.download}
            </button>
            {meta && (
              <button
                type="button"
                disabled={busy}
                onClick={remove}
                className="flex items-center gap-x-2 rounded-xl border-2 border-b-4 px-4 py-3 font-bold text-rose-600 hover:bg-black/5 disabled:opacity-50"
              >
                <Trash2 className="h-5 w-5" />
                {t.offline.remove}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
};
