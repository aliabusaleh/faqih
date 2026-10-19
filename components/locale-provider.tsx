"use client";

import { createContext, useContext, type PropsWithChildren } from "react";

import { DEFAULT_LOCALE, messages, type Locale } from "@/lib/i18n";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export const LocaleProvider = ({
  locale,
  children,
}: PropsWithChildren<{ locale: Locale }>) => (
  <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
);

export const useLocale = () => useContext(LocaleContext);
export const useMessages = () => messages[useLocale()];
