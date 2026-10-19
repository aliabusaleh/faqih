import { cookies } from "next/headers";

import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, messages } from "@/lib/i18n";

// Server-side: the visitor's chosen language (cookie), else the default.
export const getLocale = async () => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
};

export const getMessages = async () => messages[await getLocale()];
