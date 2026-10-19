import type { SourceText } from "./sources";

// Builds courses from imported source texts. Adab rule: every wrong answer is
// another *real* text (ayah, hadith, dhikr) or a real value from the data;
// nothing is altered or invented.

export type OptionSpec = { text: string; correct: boolean };

export type ChallengeSpec = {
  prompt: string;
  question: string;
  sourceKey: string;
  options: OptionSpec[];
};

export type LessonSpec = { title: string; challenges: ChallengeSpec[] };
export type UnitSpec = {
  title: string;
  description: string;
  lessons: LessonSpec[];
};

export type CourseSpec = {
  slug: string;
  track: "quran" | "hadith" | "adhkar";
  title: string;
  imageSrc: string;
  units: UnitSpec[];
};

/* ---------- helpers ---------- */

// Deterministic shuffle so re-imports produce the same lessons.
const seeded = (seed: string) => {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
};

const shuffle = <T>(items: T[], seed: string) => {
  const rand = seeded(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

// Picks `count` distractors from `pool`, excluding the answer.
const pick = <T>(pool: T[], exclude: T, count: number, seed: string) =>
  shuffle(
    pool.filter((p) => p !== exclude),
    seed
  ).slice(0, count);

const options = (correct: string, wrong: string[], seed: string) =>
  shuffle(
    [
      { text: correct, correct: true },
      ...wrong.map((text) => ({ text, correct: false })),
    ],
    `${seed}:options`
  );

// Shortens long text on a word boundary. Shown with "…" so it is clearly an
// excerpt of the source, not a rewording.
const excerpt = (text: string, max: number) => {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" "))} …`;
};

const chunk = <T>(items: T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, i * size + size)
  );

/* ---------- Quran: Al-Fatiha ---------- */

export const buildFatiha = (ayat: SourceText[]): CourseSpec => {
  const translations = ayat.map((a) => a.translation!);
  const arabic = ayat.map((a) => a.arabic);

  const meaning = (ayah: SourceText): ChallengeSpec => ({
    prompt: "What does this ayah mean?",
    question: ayah.arabic,
    sourceKey: ayah.key,
    options: options(
      ayah.translation!,
      pick(translations, ayah.translation!, 2, ayah.key),
      ayah.key
    ),
  });

  const next = (ayah: SourceText, following: SourceText): ChallengeSpec => ({
    prompt: "Which ayah comes next?",
    question: ayah.arabic,
    sourceKey: following.key,
    options: options(
      following.arabic,
      pick(
        arabic.filter((a) => a !== ayah.arabic),
        following.arabic,
        2,
        `${following.key}:next`
      ),
      `${following.key}:next`
    ),
  });

  return {
    slug: "quran-al-fatiha",
    track: "quran",
    title: "Quran: Al-Fatiha",
    imageSrc: "/courses/quran.svg",
    units: [
      {
        title: "Al-Fatiha",
        description: "The Opening: its meaning and order (7 ayat)",
        lessons: [
          {
            title: "Meaning: ayat 1–4",
            challenges: ayat.slice(0, 4).map(meaning),
          },
          {
            title: "Meaning: ayat 5–7",
            challenges: ayat.slice(4).map(meaning),
          },
          {
            title: "What comes next?",
            challenges: ayat.slice(0, -1).map((a, i) => next(a, ayat[i + 1])),
          },
        ],
      },
    ],
  };
};

/* ---------- Hadith: an-Nawawi's Forty ---------- */

// The Prophet's words: the first quoted passage, else the text after "said:".
const hadithSaying = (h: SourceText) => {
  const text = h.translation!.replace(/\s*\[[^\]]+\]\s*$/, "");
  const quoted = text.match(/"([^"]{25,})"/)?.[1];
  const saying =
    quoted ??
    text
      .split(/said:\s*/)
      .slice(1)
      .join(" ") ??
    text;
  return excerpt(saying || text, 150);
};

export const buildNawawi = (all: SourceText[], count: number): CourseSpec => {
  const hadiths = all.slice(0, count);
  const sayings = all.map(hadithSaying);
  const refs = [
    ...new Set(all.map((h) => h.hadithRef).filter(Boolean)),
  ] as string[];

  const which = (h: SourceText): ChallengeSpec => {
    const saying = hadithSaying(h);
    return {
      prompt: `Which of these is Hadith #${h.number}?`,
      question: `an-Nawawi's Forty Hadith, #${h.number}`,
      sourceKey: h.key,
      options: options(saying, pick(sayings, saying, 2, h.key), h.key),
    };
  };

  const recorded = (h: SourceText): ChallengeSpec[] =>
    h.hadithRef
      ? [
          {
            prompt: "Who recorded this hadith?",
            question: hadithSaying(h),
            sourceKey: h.key,
            options: options(
              h.hadithRef,
              pick(refs, h.hadithRef, 2, `${h.key}:ref`),
              `${h.key}:ref`
            ),
          },
        ]
      : [];

  return {
    slug: "hadith-nawawi-40",
    track: "hadith",
    title: "Hadith: an-Nawawi's Forty",
    imageSrc: "/courses/hadith.svg",
    units: [
      {
        title: `Hadith 1–${count}`,
        description: "The foundations: intention, Islam, iman, ihsan…",
        lessons: chunk(hadiths, 2).map((pair) => ({
          title: `Hadith ${pair[0].number}–${pair[pair.length - 1].number}`,
          challenges: pair.flatMap((h) => [which(h), ...recorded(h)]),
        })),
      },
    ],
  };
};

/* ---------- Adhkar: Hisn al-Muslim, morning & evening ---------- */

export const buildMorningEvening = (adhkar: SourceText[]): CourseSpec => {
  const withMeaning = adhkar.filter((d) => d.translation);
  const meanings = withMeaning.map((d) => excerpt(d.translation!, 160));
  const counts = [...new Set(adhkar.map((d) => d.repeat ?? 1))];

  const meaning = (d: SourceText): ChallengeSpec => {
    const answer = excerpt(d.translation!, 160);
    return {
      prompt: "What does this dhikr mean?",
      question: excerpt(d.arabic, 220),
      sourceKey: d.key,
      options: options(answer, pick(meanings, answer, 2, d.key), d.key),
    };
  };

  const times = (d: SourceText): ChallengeSpec => {
    const label = (n: number) => (n === 1 ? "Once" : `${n} times`);
    const answer = d.repeat ?? 1;
    return {
      prompt: "How many times is it said?",
      question: excerpt(d.arabic, 220),
      sourceKey: d.key,
      options: options(
        label(answer),
        pick(counts, answer, 2, `${d.key}:times`).map(label),
        `${d.key}:times`
      ),
    };
  };

  return {
    slug: "adhkar-morning-evening",
    track: "adhkar",
    title: "Adhkar: Morning & Evening",
    imageSrc: "/courses/adhkar.svg",
    units: [
      {
        title: "Morning & Evening",
        description: "From Hisn al-Muslim (Fortress of the Muslim)",
        lessons: chunk(withMeaning, 4).map((group, i) => ({
          title: `Adhkar ${i * 4 + 1}–${i * 4 + group.length}`,
          challenges: group.flatMap((d) => [meaning(d), times(d)]),
        })),
      },
    ],
  };
};
