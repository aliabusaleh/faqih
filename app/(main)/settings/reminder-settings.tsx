"use client";

import { useEffect, useState } from "react";

import { BellOff, BellRing } from "lucide-react";
import { toast } from "sonner";

import { deleteReminder, getReminder, saveReminder } from "@/actions/reminders";
import { useLocale, useMessages } from "@/components/locale-provider";
import { registerServiceWorker } from "@/lib/offline";
import { cn } from "@/lib/utils";

const DEFAULT_TIME = "07:00";

type Status =
  | "loading"
  | "unsupported"
  | "not-configured"
  | "ios-install"
  | "denied"
  | "off"
  | "on";

// The public push key, as the browser wants it.
const applicationServerKey = (base64: string) => {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
};

const pushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

// The app was built without the public push key (set in the deployment's
// environment), so no browser can subscribe. Not the learner's browser's fault.
const pushConfigured = () => !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// iPhone/iPad only allow web push for sites added to the home screen.
const needsHomeScreen = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) &&
  !window.matchMedia("(display-mode: standalone)").matches;

const currentSubscription = async () => {
  const registration = await navigator.serviceWorker.getRegistration("/");
  return (await registration?.pushManager.getSubscription()) ?? null;
};

// Daily wird reminder: on/off and the time, for this device.
export const ReminderSettings = () => {
  const t = useMessages();
  const locale = useLocale();
  const [status, setStatus] = useState<Status>("loading");
  const [time, setTime] = useState(DEFAULT_TIME);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      if (!pushConfigured()) return setStatus("not-configured");
      if (!pushSupported())
        return setStatus(
          typeof window !== "undefined" && needsHomeScreen()
            ? "ios-install"
            : "unsupported"
        );
      if (Notification.permission === "denied") return setStatus("denied");
      const subscription = await currentSubscription();
      const saved = subscription
        ? await getReminder(subscription.endpoint).catch(() => null)
        : null;
      if (saved) setTime(saved.reminderTime);
      setStatus(saved ? "on" : "off");
    })();
  }, []);

  const save = async (reminderTime: string) => {
    setBusy(true);
    try {
      if ((await Notification.requestPermission()) !== "granted") {
        setStatus("denied");
        return;
      }
      // Keeps offline use on, if it was downloaded (lib/offline).
      const registration = await registerServiceWorker();
      await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
          ),
        }));
      const { keys } = subscription.toJSON();
      await saveReminder({
        endpoint: subscription.endpoint,
        p256dh: keys?.p256dh ?? "",
        auth: keys?.auth ?? "",
        reminderTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale,
      });
      setStatus("on");
      toast.success(t.settings.reminderSaved);
    } catch {
      toast.error(t.lesson.error);
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    try {
      const subscription = await currentSubscription();
      if (subscription) {
        await deleteReminder(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("off");
    } catch {
      toast.error(t.lesson.error);
    } finally {
      setBusy(false);
    }
  };

  const note =
    status === "unsupported"
      ? t.settings.reminderUnsupported
      : status === "not-configured"
        ? t.settings.reminderNotConfigured
        : status === "ios-install"
          ? t.settings.reminderIos
          : status === "denied"
            ? t.settings.reminderDenied
            : null;

  return (
    <section className="flex flex-col gap-y-3">
      <h2 className="text-lg font-bold text-neutral-700">
        {t.settings.reminder}
      </h2>
      <p className="text-sm text-neutral-500">
        {t.settings.reminderDescription}
      </p>

      {note ? (
        <p className="rounded-xl border-2 bg-amber-50 p-4 text-sm text-amber-700">
          {note}
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy || status === "loading"}
            aria-pressed={status === "on"}
            onClick={() => (status === "on" ? turnOff() : save(time))}
            className={cn(
              "flex items-center gap-x-2 rounded-xl border-2 border-b-4 px-4 py-3 font-bold text-neutral-700 hover:bg-black/5 disabled:opacity-50",
              status === "on" && "border-brand-300 bg-brand-100 text-brand-600"
            )}
          >
            {status === "on" ? (
              <BellRing className="h-5 w-5" />
            ) : (
              <BellOff className="h-5 w-5" />
            )}
            {status === "on" ? t.settings.reminderOn : t.settings.reminderOff}
          </button>

          <label className="flex items-center gap-x-2 font-bold text-neutral-700">
            {t.settings.reminderTime}
            <input
              type="time"
              value={time}
              disabled={busy}
              onChange={(e) => {
                setTime(e.target.value);
                // Already on: save the new time straight away.
                if (status === "on" && e.target.value)
                  void save(e.target.value);
              }}
              className="rounded-xl border-2 border-b-4 bg-white px-3 py-2 text-base"
            />
          </label>
        </div>
      )}
    </section>
  );
};
