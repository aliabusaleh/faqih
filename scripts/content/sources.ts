import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

// Fetches primary texts from public APIs and normalises them into SourceText
// records. Raw responses are cached in content/cache (gitignored: translations
// and audio are copyrighted and must not be redistributed from this repo).

export type SourceText = {
  key: string;
  kind: "ayah" | "hadith" | "dhikr";
  arabic: string;
  translation: string | null;
  translationBy: string | null;
  citation: string;
  hadithRef: string | null;
  sourceUrl: string;
  audioSrc: string | null;
  repeat: number | null;
  // Not stored: helpers for building challenges.
  number: number;
};

const CACHE_DIR = path.join(process.cwd(), "content", "cache");

const fetchJson = async <T>(
  url: string,
  cacheName: string,
  refresh: boolean
) => {
  const file = path.join(CACHE_DIR, cacheName);

  if (!refresh && existsSync(file))
    return JSON.parse(readFileSync(file, "utf8")) as T;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);

  // Some APIs (hisnmuslim.com) prefix a UTF-8 BOM.
  const text = (await res.text()).replace(/^﻿/, "");
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(file, text);

  return JSON.parse(text) as T;
};

const clean = (s: string) => s.replace(/^﻿/, "").trim();

/* ---------- Quran: api.alquran.cloud (Uthmani text from Tanzil) ---------- */

type AlQuranEdition = {
  edition: { identifier: string; englishName: string };
  ayahs: { numberInSurah: number; text: string; audio?: string }[];
};

export const fetchSurah = async (
  surah: number,
  refresh: boolean
): Promise<SourceText[]> => {
  const editions = "quran-uthmani,en.sahih,ar.alafasy";
  const { data } = await fetchJson<{ data: AlQuranEdition[] }>(
    `https://api.alquran.cloud/v1/surah/${surah}/editions/${editions}`,
    `quran-${surah}.json`,
    refresh
  );

  const byId = (id: string) => {
    const edition = data.find((e) => e.edition.identifier === id);
    if (!edition) throw new Error(`alquran.cloud: missing edition ${id}`);
    return edition;
  };
  const arabic = byId("quran-uthmani");
  const english = byId("en.sahih");
  const audio = byId("ar.alafasy");

  return arabic.ayahs.map((ayah, i) => ({
    key: `quran:${surah}:${ayah.numberInSurah}`,
    kind: "ayah",
    arabic: clean(ayah.text),
    translation: clean(english.ayahs[i].text),
    translationBy: "Sahih International",
    citation: `Quran ${surah}:${ayah.numberInSurah}`,
    hadithRef: null,
    sourceUrl: `https://quran.com/${surah}/${ayah.numberInSurah}`,
    audioSrc: audio.ayahs[i].audio ?? null,
    repeat: null,
    number: ayah.numberInSurah,
  }));
};

/* ---------- Hadith: fawazahmed0/hadith-api (via jsDelivr) ---------- */

type HadithEdition = {
  hadiths: { hadithnumber: number; text: string }[];
};

export const fetchNawawi = async (refresh: boolean): Promise<SourceText[]> => {
  const base = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions";
  const [en, ar] = await Promise.all([
    fetchJson<HadithEdition>(
      `${base}/eng-nawawi.min.json`,
      "nawawi-en.json",
      refresh
    ),
    fetchJson<HadithEdition>(
      `${base}/ara-nawawi.min.json`,
      "nawawi-ar.json",
      refresh
    ),
  ]);

  return en.hadiths
    .filter((h) => h.hadithnumber > 0)
    .map((h) => {
      const arabic = ar.hadiths.find((a) => a.hadithnumber === h.hadithnumber);
      // The English text ends with the takhrij, e.g. "[Bukhari & Muslim]".
      const takhrij = h.text.match(/\[([^\]]+)\]\s*$/)?.[1].trim() ?? null;

      return {
        key: `nawawi:${h.hadithnumber}`,
        kind: "hadith" as const,
        arabic: clean(arabic?.text ?? ""),
        translation: clean(h.text),
        translationBy: "fawazahmed0/hadith-api (English)",
        citation: `an-Nawawi's Forty Hadith #${h.hadithnumber}`,
        hadithRef: takhrij,
        sourceUrl: `https://sunnah.com/nawawi40:${h.hadithnumber}`,
        audioSrc: null,
        repeat: null,
        number: h.hadithnumber,
      };
    })
    .filter((h) => h.arabic);
};

/* ---------- Adhkar: hisnmuslim.com API (Hisn al-Muslim, al-Qahtani) ---------- */

type HisnEntry = {
  ID: number;
  ARABIC_TEXT: string;
  TRANSLATED_TEXT: string;
  REPEAT: number;
  AUDIO: string;
};

// The API gives no hadith reference per dhikr. References confirmed by a
// reviewer (from the book's footnotes) go in this file: { "<ID>": "Muslim 2723" }.
const HISN_REFERENCES = path.join(
  process.cwd(),
  "content",
  "references",
  "hisn-al-muslim.json"
);

export const fetchHisnChapter = async (
  chapter: number,
  refresh: boolean
): Promise<SourceText[]> => {
  const [ar, en] = await Promise.all([
    fetchJson<Record<string, HisnEntry[]>>(
      `https://www.hisnmuslim.com/api/ar/${chapter}.json`,
      `hisn-ar-${chapter}.json`,
      refresh
    ),
    fetchJson<Record<string, HisnEntry[]>>(
      `https://www.hisnmuslim.com/api/en/${chapter}.json`,
      `hisn-en-${chapter}.json`,
      refresh
    ),
  ]);

  const references: Record<string, string> = existsSync(HISN_REFERENCES)
    ? JSON.parse(readFileSync(HISN_REFERENCES, "utf8"))
    : {};

  const arEntries = Object.values(ar)[0];
  const enEntries = Object.values(en)[0];

  return arEntries.map((entry, i) => {
    const english = enEntries.find((e) => e.ID === entry.ID);

    return {
      key: `hisn:${entry.ID}`,
      kind: "dhikr" as const,
      arabic: clean(entry.ARABIC_TEXT),
      translation: english?.TRANSLATED_TEXT
        ? clean(english.TRANSLATED_TEXT)
        : null,
      translationBy: "hisnmuslim.com (English)",
      citation: `Hisn al-Muslim #${entry.ID}`,
      hadithRef: references[String(entry.ID)] ?? null,
      sourceUrl: `https://www.hisnmuslim.com/i/en/${chapter}`,
      audioSrc: entry.AUDIO?.replace(/^http:/, "https:") || null,
      repeat: entry.REPEAT || 1,
      number: i + 1,
    };
  });
};
