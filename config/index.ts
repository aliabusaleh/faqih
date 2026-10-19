import type { Metadata } from "next";

export const APP_NAME = "Faqih";
// Shown with the name so people know what the app teaches, not just fiqh.
export const APP_TAGLINE = "Learn Quran, Hadith & Sirah";

export const siteConfig: Metadata = {
  title: `${APP_NAME}: ${APP_TAGLINE}`,
  description:
    "Learn the Quran, Hadith and Sirah in a few minutes a day with bite-sized lessons, quizzes and progress tracking.",
  keywords: [
    "quran",
    "hadith",
    "sirah",
    "seerah",
    "islam",
    "islamic studies",
    "learn arabic",
    "tajweed",
    "hifz",
    "muslim",
  ] as Array<string>,
  authors: {
    name: "Ali Abu Saleh",
    url: "https://github.com/aliabusaleh",
  },
} as const;

export const links = {
  sourceCode: "https://github.com/aliabusaleh/faqih",
} as const;

export const features = {
  // Stripe subscriptions ("unlimited hearts"). Off by default: knowledge stays free.
  payments: process.env.NEXT_PUBLIC_ENABLE_PAYMENTS === "true",
  // Local dev login: skips Clerk and signs you in as a fixed dev user. Never on in production.
  localAuth:
    process.env.NEXT_PUBLIC_DEV_AUTH === "local" &&
    process.env.NODE_ENV !== "production",
  // Unreviewed (draft) lessons: visible in development, hidden in production
  // unless NEXT_PUBLIC_SHOW_DRAFTS=true.
  showDrafts:
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_SHOW_DRAFTS === "true",
} as const;
