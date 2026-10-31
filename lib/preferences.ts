import { cookies } from "next/headers";

import { localDate } from "@/lib/day";

import {
  DEFAULT_MODE,
  LAST_JUZ_COOKIE,
  LAST_READ_COOKIE,
  LAST_UNIT_COOKIE,
  MODE_COOKIE,
  READ_ALOUD_COOKIE,
  TIME_ZONE_COOKIE,
  TOUR_COOKIE,
  isMode,
  readAloudOn,
} from "@/lib/mode";

// Server-side: this device's kids/full mode, else the default.
export const getMode = async () => {
  const value = (await cookies()).get(MODE_COOKIE)?.value;
  return isMode(value) ? value : DEFAULT_MODE;
};

export const isTourDone = async () =>
  (await cookies()).get(TOUR_COOKIE)?.value === "1";

export const isReadAloudOn = async () =>
  readAloudOn((await cookies()).get(READ_ALOUD_COOKIE)?.value, await getMode());

/** The unit of the last lesson opened on this device, if any. */
export const getLastUnitId = async () => {
  const value = Number((await cookies()).get(LAST_UNIT_COOKIE)?.value);
  return Number.isInteger(value) && value > 0 ? value : null;
};

/** Read mode: the last surah or juz' read on this device, e.g. "surah/2". */
export const getLastRead = async () => {
  const value = (await cookies()).get(LAST_READ_COOKIE)?.value ?? "";
  return /^(surah|juz)\/\d+$/.test(value) ? value : null;
};

/** The juz' last shown on the learn page on this device, if any. */
export const getLastJuz = async () => {
  const value = Number((await cookies()).get(LAST_JUZ_COOKIE)?.value);
  return Number.isInteger(value) && value > 0 ? value : null;
};

/** The learner's date today, in this device's time zone (else UTC). */
export const getToday = async () =>
  localDate((await cookies()).get(TIME_ZONE_COOKIE)?.value);
