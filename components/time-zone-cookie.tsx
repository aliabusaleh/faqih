"use client";

import { useEffect } from "react";

import { TIME_ZONE_COOKIE, setPreferenceCookie } from "@/lib/mode";

// Tells the server this device's time zone (lib/preferences getToday), so
// "today" for the daily review and the streak is the learner's own.
export const TimeZoneCookie = () => {
  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const current = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${TIME_ZONE_COOKIE}=`))
      ?.slice(TIME_ZONE_COOKIE.length + 1);
    if (timeZone && current !== timeZone)
      setPreferenceCookie(TIME_ZONE_COOKIE, timeZone);
  }, []);

  return null;
};
