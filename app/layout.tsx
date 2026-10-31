import { ClerkProvider } from "@clerk/nextjs";
import { arSA } from "@clerk/localizations";
import type { Metadata, Viewport } from "next";
import {
  Amiri_Quran,
  Noto_Naskh_Arabic,
  Nunito,
  Reem_Kufi,
} from "next/font/google";
import { preconnect } from "react-dom";

import { LocaleProvider } from "@/components/locale-provider";
import { ModeProvider } from "@/components/mode-provider";
import { OfflineBanner } from "@/components/offline-banner";
import { ReadAloudProvider } from "@/components/read-aloud";
import { TimeZoneCookie } from "@/components/time-zone-cookie";
import { ExitModal } from "@/components/modals/exit-modal";
import { HeartsModal } from "@/components/modals/hearts-modal";
import { PracticeModal } from "@/components/modals/practice-modal";
import { Toaster } from "@/components/ui/sonner";
import { APP_NAME, features, siteConfig } from "@/config";
import { dir, messages } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getMode, isReadAloudOn } from "@/lib/preferences";
import { AUDIO_ORIGINS } from "@/lib/recitation";
import { cn } from "@/lib/utils";

import "./globals.css";

const font = Nunito({ subsets: ["latin"], variable: "--font-nunito" });

// Quranic text (Uthmani-style) and general Arabic text.
const quranFont = Amiri_Quran({
  subsets: ["arabic"],
  weight: "400",
  variable: "--font-quran",
});
const arabicFont = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
});
// The name فقيه in the logo (components/logo).
const kufiFont = Reem_Kufi({
  subsets: ["arabic"],
  weight: "700",
  variable: "--font-kufi",
});

export const viewport: Viewport = {
  themeColor: "#1b3a6b",
};

export const generateMetadata = async (): Promise<Metadata> => {
  const t = messages[await getLocale()];
  return {
    ...siteConfig,
    title: `${APP_NAME}: ${t.app.tagline}`,
    description: t.app.hero,
  };
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Open the connections to the recitation hosts early: the first ayah
  // then plays without waiting for DNS and TLS.
  for (const origin of AUDIO_ORIGINS) preconnect(origin);

  const [locale, mode, readAloud] = await Promise.all([
    getLocale(),
    getMode(),
    isReadAloudOn(),
  ]);

  const app = (
    <html lang={locale} dir={dir(locale)}>
      <body
        className={cn(
          // Nunito's fallback font has Arabic glyphs, so Arabic needs its own stack.
          locale === "ar" ? "font-arabic" : "font-sans",
          font.variable,
          quranFont.variable,
          arabicFont.variable,
          kufiFont.variable
        )}
      >
        <LocaleProvider locale={locale}>
          <ModeProvider mode={mode}>
            <ReadAloudProvider enabled={readAloud}>
              <Toaster theme="light" richColors closeButton />
              <OfflineBanner />
              <TimeZoneCookie />
              <ExitModal />
              <HeartsModal />
              <PracticeModal />
              {children}
            </ReadAloudProvider>
          </ModeProvider>
        </LocaleProvider>
      </body>
    </html>
  );

  // Local dev login (NEXT_PUBLIC_DEV_AUTH=local) runs without Clerk.
  if (features.localAuth) return app;

  return (
    <ClerkProvider
      // Clerk's sign-in and sign-up screens follow the app language.
      localization={locale === "ar" ? arSA : undefined}
      appearance={{
        layout: {
          logoImageUrl: "/favicon.ico",
        },
        variables: {
          colorPrimary: "#1b3a6b",
        },
      }}
      afterSignOutUrl="/"
    >
      {app}
    </ClerkProvider>
  );
}
