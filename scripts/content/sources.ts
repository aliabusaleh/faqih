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
  citationAr: string;
  hadithRef: string | null;
  hadithRefAr: string | null;
  sourceUrl: string;
  audioSrc: string | null;
  repeat: number | null;
  // Not stored: helpers for building challenges.
  number: number;
  surah?: number;
  juz?: number;
  hizbQuarter?: number;
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

const arNum = (n: number) => n.toLocaleString("ar-EG");

/* ---------- Quran: api.alquran.cloud (Tanzil Uthmani text) ---------- */

// Faqih shows the Quran in its rasm, the Uthmani spelling of the mushaf
// (Tanzil's Uthmani text), e.g. "عُمْىٌ" and "وَبِٱلْءَاخِرَةِ", not the everyday
// (imla'i) spelling "عُمْيٌ", "وَبِالْآخِرَةِ". It is shown in Amiri Quran, a font
// made for this text (font-quran). Typed answers still accept the everyday
// spelling (lib/arabic.ts). Quran.com's word-by-word audio is numbered by
// these same Uthmani words (scripts/content/recitations.ts).

export const SURAH_COUNT = 114;
export const AYAH_COUNT = 6236;

export type Surah = {
  number: number;
  name: string; // Arabic, e.g. "سُورَةُ ٱلْفَاتِحَةِ"
  englishName: string;
  englishNameTranslation: string;
  revelationType: string;
  ayahCount: number;
};

type AlQuranFull = {
  surahs: (Omit<Surah, "ayahCount"> & {
    ayahs: {
      number: number;
      numberInSurah: number;
      text: string;
      audio?: string;
      juz: number;
      hizbQuarter: number; // 1-240 across the mushaf
    }[];
  })[];
};

// Removes Arabic diacritics and Quranic marks, for comparing words.
const bare = (s: string) =>
  s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "");

// The edition prefixes the basmalah to the first ayah of every surah
// except Al-Fatiha (where it is ayah 1) and At-Tawbah. It isn't part of those
// ayat, so drop it. Compared without diacritics, since its spelling varies.
const stripBasmalah = (surah: number, text: string, basmalah: string) => {
  if (surah === 1) return text;
  const w = text.split(" ");
  const b = basmalah.split(" ");
  const prefixed = b.every((word, i) => bare(w[i] ?? "") === bare(word));
  return prefixed ? w.slice(b.length).join(" ") : text;
};

/** The whole Quran: 114 surahs and 6,236 ayat with translation and audio. */
export const fetchQuran = async (
  refresh: boolean
): Promise<{ surahs: Surah[]; ayat: SourceText[] }> => {
  const edition = (id: string) =>
    fetchJson<{ data: AlQuranFull }>(
      `https://api.alquran.cloud/v1/quran/${id}`,
      `quran-${id}.json`,
      refresh
    ).then(({ data }) => data.surahs);

  const [arabic, english, audio] = await Promise.all([
    edition("quran-uthmani"),
    edition("en.sahih"),
    edition("ar.alafasy"),
  ]);

  const flat = (surahs: AlQuranFull["surahs"]) =>
    surahs.flatMap((s) => s.ayahs);
  const [ar, en, au] = [flat(arabic), flat(english), flat(audio)];

  if (arabic.length !== SURAH_COUNT || ar.length !== AYAH_COUNT)
    throw new Error(
      `alquran.cloud: expected ${SURAH_COUNT} surahs and ${AYAH_COUNT} ayat, got ${arabic.length} and ${ar.length}`
    );
  if (en.length !== AYAH_COUNT || au.length !== AYAH_COUNT)
    throw new Error(
      "alquran.cloud: translation or audio edition is incomplete"
    );

  const basmalah = clean(ar[0].text);

  const ayat = arabic.flatMap((surah) =>
    surah.ayahs.map((ayah): SourceText => {
      // Editions are aligned by the ayah's number in the whole Quran.
      const i = ayah.number - 1;
      return {
        key: `quran:${surah.number}:${ayah.numberInSurah}`,
        kind: "ayah",
        arabic: stripBasmalah(surah.number, clean(ayah.text), basmalah),
        translation: clean(en[i].text),
        translationBy: "Sahih International",
        citation: `Quran ${surah.number}:${ayah.numberInSurah}`,
        citationAr: `${surah.name}: ${arNum(ayah.numberInSurah)}`,
        hadithRef: null,
        hadithRefAr: null,
        sourceUrl: `https://quran.com/${surah.number}/${ayah.numberInSurah}`,
        audioSrc: au[i].audio ?? null,
        repeat: null,
        number: ayah.numberInSurah,
        surah: surah.number,
        juz: ayah.juz,
        hizbQuarter: ayah.hizbQuarter,
      };
    })
  );

  return {
    surahs: arabic.map(({ ayahs, ...surah }) => ({
      number: surah.number,
      name: surah.name,
      englishName: surah.englishName,
      englishNameTranslation: surah.englishNameTranslation,
      revelationType: surah.revelationType,
      ayahCount: ayahs.length,
    })),
    ayat,
  };
};

/** The ayat of one surah, in order. */
export const surahAyat = (ayat: SourceText[], surah: number) =>
  ayat.filter((a) => a.surah === surah);

/* ---------- Hadith: fawazahmed0/hadith-api (via jsDelivr) ---------- */

// The English takhrij values in this edition, with their Arabic names. A
// takhrij not listed here gets no Arabic reference (and so no question).
const TAKHRIJ_AR: Record<string, string> = {
  "Bukhari & Muslim": "رواه البخاري ومسلم",
  "Al-Bukhari": "رواه البخاري",
  Muslim: "رواه مسلم",
};

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
        citationAr: `الأربعون النووية، الحديث ${arNum(h.hadithnumber)}`,
        hadithRef: takhrij,
        hadithRefAr: (takhrij && TAKHRIJ_AR[takhrij]) ?? null,
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
// reviewer (from the book's footnotes) go in this file, keyed by dhikr ID:
//   { "77": { "en": "Muslim 2723", "ar": "رواه مسلم ٢٧٢٣" } }
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

  const references: Record<string, { en?: string; ar?: string }> = existsSync(
    HISN_REFERENCES
  )
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
      citationAr: `حصن المسلم، رقم ${arNum(entry.ID)}`,
      hadithRef: references[String(entry.ID)]?.en ?? null,
      hadithRefAr: references[String(entry.ID)]?.ar ?? null,
      sourceUrl: `https://www.hisnmuslim.com/i/ar/${chapter}`,
      audioSrc: entry.AUDIO?.replace(/^http:/, "https:") || null,
      repeat: entry.REPEAT || 1,
      number: i + 1,
    };
  });
};
