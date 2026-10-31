// Lenient matching for typed Arabic answers.
//
// Faqih shows Quran text in its rasm (Tanzil's Uthmani script), which spells
// many words differently from everyday (imla'i) Arabic: "ٱلْعَٰلَمِينَ" vs
// "العالمين", "ٱلصَّلَوٰةَ" vs "الصلاة". A learner types the everyday spelling,
// without diacritics. So both sides are reduced to a bare skeleton before
// comparing:
// - diacritics, Quranic marks and tatweel are removed
// - waw or ya carrying a dagger alef (ٱلصَّلَوٰةَ) count as alef
// - small waw and ya (إِبْرَٰهِـۧمَ) count as full letters
// - alef forms, hamza seats, alef maqsura and ta marbuta are unified
// - every alef is then dropped, since Uthmani often omits it (or writes it as
//   a dagger alef) where imla'i spells it out
// This accepts a word typed in either spelling. It is lenient on purpose:
// it checks recall of the words, not spelling.

const DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED\u0640]/g;

export const normalizeArabic = (text: string) =>
  text
    .normalize("NFC")
    .replace(/[\u0648\u0649]\u0670/g, "\u0627")
    .replace(/\u0670/g, "\u0627")
    .replace(/\u06E5/g, "\u0648")
    .replace(/[\u06E6\u06E7]/g, "\u064A")
    .replace(DIACRITICS, "")
    .replace(/[\u0623\u0625\u0622\u0671\u0672\u0673]/g, "\u0627")
    .replace(/\u0624/g, "\u0648")
    .replace(/[\u0626\u0649]/g, "\u064A")
    .replace(/\u0629/g, "\u0647")
    .replace(/[\u0621\u0627]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeLatin = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

const hasArabic = (text: string) => /[\u0600-\u06FF]/.test(text);

/** Whether a typed answer matches the expected text (Arabic or English). */
export const answersMatch = (typed: string, expected: string) => {
  const normalize = hasArabic(expected) ? normalizeArabic : normalizeLatin;
  const a = normalize(typed);
  return a.length > 0 && a === normalize(expected);
};
