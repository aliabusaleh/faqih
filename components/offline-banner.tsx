"use client";

import { useEffect, useState } from "react";

import { CloudOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useLocale, useMessages } from "@/components/locale-provider";
import { formatNumber } from "@/lib/i18n";
import { onQueueChange, queuedAnswers, syncAnswers } from "@/lib/offline-queue";

// Says when there's no connection and how many answers wait to be sent, and
// sends them as soon as the connection is back.
export const OfflineBanner = () => {
  const t = useMessages();
  const locale = useLocale();
  const router = useRouter();
  const [offline, setOffline] = useState(false);
  const [waiting, setWaiting] = useState(0);

  useEffect(() => {
    const count = () =>
      setWaiting(queuedAnswers().filter((a) => a.kind !== "day").length);
    const sync = async () => {
      if (!navigator.onLine || queuedAnswers().length === 0) return;
      const sent = await syncAnswers();
      if (sent > 0) {
        toast.success(t.offline.synced);
        router.refresh();
      }
    };
    const update = () => {
      setOffline(!navigator.onLine);
      void sync();
    };

    update();
    count();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const stop = onQueueChange(count);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      stop();
    };
  }, [router, t]);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 top-2 z-[60] flex justify-center px-4"
    >
      <p className="flex items-center gap-x-2 rounded-full bg-neutral-800/90 px-4 py-2 text-sm font-bold text-white shadow-lg">
        <CloudOff className="h-4 w-4 shrink-0" />
        {waiting > 0
          ? t.offline.bannerWaiting(formatNumber(locale, waiting))
          : t.offline.banner}
      </p>
    </div>
  );
};
