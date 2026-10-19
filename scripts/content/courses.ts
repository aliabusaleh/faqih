import type { SourceText } from "./sources";

// Builds courses from imported source texts, one course per language.
//
// Rules:
// - Monolingual: a course, its questions and its options are all Arabic or
//   all English. There are no "translate this" questions.
// - Adab: every wrong answer is another *real* text (ayah, hadith, dhikr) or
//   a real value from the data; nothing is altered or invented. Long texts
//   are shown as excerpts marked with "…".

export type Language = "ar" | "en";

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
  language: Language;
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

// Picks `count` distinct distractors from `pool`, excluding the answer.
const pick = <T>(pool: T[], exclude: T, count: number, seed: string) =>
  shuffle(
    [...new Set(pool)].filter((p) => p !== exclude),
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

const words = (text: string) => text.split(/\s+/).filter(Boolean);

const excerpt = (text: string, maxWords: number) => {
  const w = words(text);
  return w.length <= maxWords ? text : `${w.slice(0, maxWords).join(" ")} …`;
};

const chunk = <T>(items: T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, i * size + size)
  );

const num = (lang: Language, n: number) =>
  lang === "ar" ? n.toLocaleString("ar-EG") : String(n);

const range = (lang: Language, a: number, b: number) =>
  `${num(lang, a)}–${num(lang, b)}`;

// Hisn al-Muslim marks the dhikr with (( )) and notes with [ ]; drop the
// markers in excerpts, keep the words.
const stripMarkers = (text: string) =>
  text
    .replace(/<[^>]+>/g, " ")
    .replace(/\(\(|\)\)/g, "")
    .replace(/\s+/g, " ")
    .trim();

/* ---------- Quran: Al-Fatiha ---------- */

export const buildFatiha = (ayat: SourceText[], lang: Language): CourseSpec => {
  const ar = lang === "ar";
  // English lessons work with the English meaning; Arabic with the Quran text.
  const text = (a: SourceText) => (ar ? a.arabic : a.translation!);
  const all = ayat.map(text);

  const next = (ayah: SourceText, following: SourceText): ChallengeSpec => ({
    prompt: ar ? "ما الآية التالية؟" : "Which ayah comes next? (meaning)",
    question: text(ayah),
    sourceKey: following.key,
    options: options(
      text(following),
      pick(
        all.filter((t) => t !== text(ayah)),
        text(following),
        2,
        `${following.key}:next:${lang}`
      ),
      `${following.key}:next:${lang}`
    ),
  });

  // Split each ayah in half; wrong endings are the endings of other ayat.
  const halves = ayat
    .map((a) => {
      const w = words(text(a));
      const cut = Math.ceil(w.length / 2);
      return {
        ayah: a,
        start: w.slice(0, cut).join(" "),
        end: w.slice(cut).join(" "),
      };
    })
    .filter((h) => h.end);

  const complete = (h: (typeof halves)[number]): ChallengeSpec => ({
    prompt: ar ? "أكمل الآية" : "Complete the ayah (meaning)",
    question: `${h.start} …`,
    sourceKey: h.ayah.key,
    options: options(
      h.end,
      pick(
        halves.map((x) => x.end),
        h.end,
        2,
        `${h.ayah.key}:end:${lang}`
      ),
      `${h.ayah.key}:end:${lang}`
    ),
  });

  const numbers = ayat.map((a) => num(lang, a.number));
  const number = (a: SourceText): ChallengeSpec => ({
    prompt: ar
      ? "ما رقم هذه الآية في سورة الفاتحة؟"
      : "Which ayah of Al-Fatiha is this?",
    question: text(a),
    sourceKey: a.key,
    options: options(
      num(lang, a.number),
      pick(numbers, num(lang, a.number), 2, `${a.key}:num:${lang}`),
      `${a.key}:num:${lang}`
    ),
  });

  return {
    slug: `quran-al-fatiha-${lang}`,
    language: lang,
    track: "quran",
    title: ar ? "القرآن: سورة الفاتحة" : "Quran: Al-Fatiha",
    imageSrc: "/courses/quran.svg",
    units: [
      {
        title: ar ? "سورة الفاتحة" : "Al-Fatiha",
        description: ar
          ? "ترتيب الآيات وإكمالها وأرقامها (٧ آيات)"
          : "The Opening, in English meaning: order, completion and numbers",
        lessons: [
          {
            title: ar ? "ترتيب الآيات" : "What comes next?",
            challenges: ayat.slice(0, -1).map((a, i) => next(a, ayat[i + 1])),
          },
          {
            title: ar ? "أكمل الآية" : "Complete the ayah",
            challenges: halves.map(complete),
          },
          {
            title: ar ? "أرقام الآيات" : "Ayah numbers",
            challenges: ayat.map(number),
          },
        ],
      },
    ],
  };
};

/* ---------- Hadith: an-Nawawi's Forty ---------- */

// English: the Prophet's words are the first quoted passage.
const englishSaying = (h: SourceText) => {
  const text = h.translation!.replace(/\s*\[[^\]]+\]\s*$/, "");
  const quoted = text.match(/"([^"]{25,})"/)?.[1];
  const saying =
    quoted ??
    text
      .split(/said:\s*/)
      .slice(1)
      .join(" ");
  return excerpt(saying || text, 22);
};

// Arabic: the words after "the Messenger of Allah / the Prophet … said:".
// Search on text without diacritics, then cut the original at that point.
const DIACRITICS = /[ً-ٰٟـ]/;
const arabicSaying = (h: SourceText) => {
  const original = stripMarkers(h.arabic);
  let plain = "";
  const map: number[] = [];
  for (let i = 0; i < original.length; i++) {
    if (DIACRITICS.test(original[i])) continue;
    plain += original[i];
    map.push(i);
  }

  const attribution = plain.match(/(رسول الله|النبي)[^:]{0,80}:/);
  const start =
    attribution?.index !== undefined
      ? map[attribution.index + attribution[0].length]
      : (map[plain.indexOf(":") + 1] ?? 0);

  // Drop the closing takhrij ("رواه …") if present.
  const takhrij = plain.search(/\[?رواه/);
  const end = takhrij > 0 ? map[takhrij] : original.length;

  const saying = original
    .slice(start, end > start ? end : undefined)
    .replace(/^[\s"«]+|[\s"».]+$/g, "");
  return excerpt(saying, 16);
};

export const buildNawawi = (
  all: SourceText[],
  count: number,
  lang: Language
): CourseSpec => {
  const ar = lang === "ar";
  const saying = ar ? arabicSaying : englishSaying;
  const ref = (h: SourceText) => (ar ? h.hadithRefAr : h.hadithRef);

  const hadiths = all.slice(0, count);
  const sayings = all.map(saying);
  const refs = all.map(ref).filter(Boolean) as string[];

  const which = (h: SourceText): ChallengeSpec => ({
    prompt: ar
      ? `أيّ هذه هو الحديث رقم ${num(lang, h.number)}؟`
      : `Which of these is Hadith #${h.number}?`,
    question: ar
      ? `الأربعون النووية — الحديث ${num(lang, h.number)}`
      : `an-Nawawi's Forty Hadith, #${h.number}`,
    sourceKey: h.key,
    options: options(
      saying(h),
      pick(sayings, saying(h), 2, `${h.key}:${lang}`),
      `${h.key}:${lang}`
    ),
  });

  const recorded = (h: SourceText): ChallengeSpec[] => {
    const r = ref(h);
    if (!r) return [];
    return [
      {
        prompt: ar ? "من أخرج هذا الحديث؟" : "Who recorded this hadith?",
        question: saying(h),
        sourceKey: h.key,
        options: options(
          r,
          pick(refs, r, 2, `${h.key}:ref:${lang}`),
          `${h.key}:ref:${lang}`
        ),
      },
    ];
  };

  return {
    slug: `hadith-nawawi-40-${lang}`,
    language: lang,
    track: "hadith",
    title: ar ? "الحديث: الأربعون النووية" : "Hadith: an-Nawawi's Forty",
    imageSrc: "/courses/hadith.svg",
    units: [
      {
        title: ar
          ? `الأحاديث ${range(lang, 1, count)}`
          : `Hadith ${range(lang, 1, count)}`,
        description: ar
          ? "أسس الدين: النية والإسلام والإيمان والإحسان…"
          : "The foundations: intention, Islam, iman, ihsan…",
        lessons: chunk(hadiths, 2).map((pair) => ({
          title: `${ar ? "الحديث" : "Hadith"} ${range(lang, pair[0].number, pair[pair.length - 1].number)}`,
          challenges: pair.flatMap((h) => [which(h), ...recorded(h)]),
        })),
      },
    ],
  };
};

/* ---------- Adhkar: Hisn al-Muslim, morning & evening ---------- */

const timesLabel = (lang: Language, n: number) => {
  if (lang === "en") return n === 1 ? "Once" : `${n} times`;
  if (n === 1) return "مرة واحدة";
  if (n === 2) return "مرتان";
  return n <= 10 ? `${num(lang, n)} مرات` : `${num(lang, n)} مرة`;
};

export const buildMorningEvening = (
  adhkar: SourceText[],
  lang: Language
): CourseSpec => {
  const ar = lang === "ar";
  const text = (d: SourceText) => stripMarkers(ar ? d.arabic : d.translation!);
  const usable = adhkar.filter((d) => (ar ? d.arabic : d.translation));

  // "Complete the dhikr": show the opening words; options are the words that
  // follow, from this dhikr and from other adhkar.
  const STEM = ar ? 6 : 8;
  const TAIL = 8;
  const tail = (d: SourceText) => {
    const w = words(text(d)).slice(STEM);
    return w.length > TAIL ? `${w.slice(0, TAIL).join(" ")} …` : w.join(" ");
  };
  const completable = usable.filter((d) => words(text(d)).length >= STEM + 3);
  const tails = completable.map(tail);

  const complete = (d: SourceText): ChallengeSpec[] =>
    completable.includes(d)
      ? [
          {
            prompt: ar ? "أكمل الذكر" : "Complete the dhikr (meaning)",
            question: `${words(text(d)).slice(0, STEM).join(" ")} …`,
            sourceKey: d.key,
            options: options(
              tail(d),
              pick(tails, tail(d), 2, `${d.key}:tail:${lang}`),
              `${d.key}:tail:${lang}`
            ),
          },
        ]
      : [];

  const counts = [...new Set(adhkar.map((d) => d.repeat ?? 1))];
  const times = (d: SourceText): ChallengeSpec => {
    const answer = d.repeat ?? 1;
    return {
      prompt: ar ? "كم مرة يُقال هذا الذكر؟" : "How many times is it said?",
      question: excerpt(text(d), ar ? 24 : 30),
      sourceKey: d.key,
      options: options(
        timesLabel(lang, answer),
        pick(counts, answer, 2, `${d.key}:times:${lang}`).map((n) =>
          timesLabel(lang, n)
        ),
        `${d.key}:times:${lang}`
      ),
    };
  };

  return {
    slug: `adhkar-morning-evening-${lang}`,
    language: lang,
    track: "adhkar",
    title: ar ? "الأذكار: أذكار الصباح والمساء" : "Adhkar: Morning & Evening",
    imageSrc: "/courses/adhkar.svg",
    units: [
      {
        title: ar ? "أذكار الصباح والمساء" : "Morning & Evening",
        description: ar
          ? "من كتاب حصن المسلم"
          : "From Hisn al-Muslim (Fortress of the Muslim), in English meaning",
        lessons: chunk(usable, 4).map((group, i) => ({
          title: `${ar ? "الأذكار" : "Adhkar"} ${range(lang, i * 4 + 1, i * 4 + group.length)}`,
          challenges: group.flatMap((d) => [...complete(d), times(d)]),
        })),
      },
    ],
  };
};
