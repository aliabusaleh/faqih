"use client";

import { createContext, useContext } from "react";

// Whether the Arabic text on screen is Quran (a question about an ayah).
// Quran is shown in its rasm (Uthmani) in Amiri Quran, a font made for it;
// other Arabic (hadith, adhkar, the app's own words) in Noto Naskh.
const QuranText = createContext(false);

export const QuranTextProvider = QuranText.Provider;

/** True inside a question about an ayah. */
export const useQuranText = () => useContext(QuranText);
