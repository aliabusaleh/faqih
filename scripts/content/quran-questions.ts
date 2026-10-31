import { normalizeArabic } from "@/lib/arabic";
import { shuffle } from "@/lib/exercises";

import {
  type ChallengeSpec,
  type Language,
  num,
  options,
  pick,
  words,
} from "./courses";
import { type SourceText } from "./sources";

// Question makers for one surah, shared by the kids and full-Quran courses.
//
// Adab: every wrong answer is a real ayah, a real part of one, or a real
// word, from the same surah first and then from `others`. Answers that would
// also be right (a surah can repeat an ayah, e.g. Al-Kafirun) are never shown
// as wrong, and a question without enough distinct wrong answers is skipped.

const DISTRACTORS = 2;
const ORDER_MIN_WORDS = 3;
const ORDER_MAX_WORDS = 10;
const MATCH_PAIRS = 4;
const EXCERPT_WORDS = 5;
// "Put the ayat in order" shows each ayah in full; longer ayat would make
// chips too big to move around, so their order question is skipped instead.
const ORDER_AYAH_MAX_WORDS = 40;

// The words of an ayah. Marks that stand alone are kept with a word, so a
// learner never has to place a bare mark: waqf (pause) marks with the word
// before them, a leading hizb mark (۞) with the word after it. The result
// lines up with Quran.com's word positions, used for word-by-word audio.
export const ayahWords = (text: string) => {
  const out: string[] = [];
  let leading = "";
  for (const w of words(text)) {
    if (/\p{L}/u.test(w)) {
      out.push(leading ? `${leading} ${w}` : w);
      leading = "";
    } else if (out.length > 0) out[out.length - 1] += ` ${w}`;
    else leading = leading ? `${leading} ${w}` : w;
  }
  return out;
};

const excerpt = (text: string, max = EXCERPT_WORDS) => {
  const w = ayahWords(text);
  return w.length <= max ? text : `${w.slice(0, max).join(" ")} …`;
};

const halve = (text: string) => {
  const w = words(text);
  const cut = Math.ceil(w.length / 2);
  return { start: w.slice(0, cut).join(" "), end: w.slice(cut).join(" ") };
};

// Wrong answers from the same surah first, then from `otherPool`.
// `exclude` holds the right answer and anything else that would be right.
const distractors = (
  ownPool: string[],
  otherPool: string[],
  exclude: string[],
  seed: string,
  count = DISTRACTORS
) => {
  const skip = new Set(exclude);
  const own = pick(
    ownPool.filter((t) => !skip.has(t)),
    exclude[0],
    count,
    seed
  );
  const more = pick(
    otherPool.filter((t) => !skip.has(t) && !own.includes(t)),
    exclude[0],
    count - own.length,
    `${seed}:more`
  );
  const all = [...own, ...more];
  return all.length === count ? all : null;
};

export const present = (c: ChallengeSpec | null): c is ChallengeSpec =>
  c !== null;

export const quranQuestions = (
  ayat: SourceText[],
  others: SourceText[],
  lang: Language,
  seedPrefix: string
) => {
  const ar = lang === "ar";
  // The Quran is memorised in Arabic: every course shows the Arabic text.
  // English courses differ only in their instructions; the app shows the
  // meaning under each ayah.
  const text = (a: SourceText) => a.arabic;
  const seedOf = (key: string, kind: string) =>
    `${seedPrefix}:${key}:${kind}:${lang}`;

  // Computed once per surah: the full Quran has surahs of 286 ayat.
  const own = ayat.map(text);
  const rest = others.map(text);
  const ownHalves = own.map(halve);
  const restHalves = rest.map(halve);
  const ownEnds = ownHalves.map((h) => h.end).filter(Boolean);
  const restEnds = restHalves.map((h) => h.end).filter(Boolean);
  // Words with their bare form (no diacritics), for the missing-word question.
  const wordPool = (list: SourceText[]) =>
    list
      .flatMap((a) => ayahWords(a.arabic))
      .map((w) => ({ w, bare: normalizeArabic(w) }))
      .filter(({ bare }) => bare.length > 1);
  const ownWords = wordPool(ayat);
  const restWords = wordPool(others);

  /** Every text that can follow `t` in this surah. */
  const followers = (t: string) =>
    own.slice(0, -1).flatMap((o, i) => (o === t ? [own[i + 1]] : []));

  // Which ayah comes after this one?
  const next = (i: number): ChallengeSpec | null => {
    if (i + 1 >= ayat.length) return null;
    const seed = seedOf(ayat[i + 1].key, "next");
    const wrong = distractors(
      own,
      rest,
      [own[i + 1], ...followers(own[i]), own[i]],
      seed
    );
    if (!wrong) return null;
    return {
      prompt: ar ? "ما الآية التالية؟" : "Which ayah comes next?",
      question: own[i],
      sourceKey: ayat[i + 1].key,
      options: options(own[i + 1], wrong, seed),
    };
  };

  // The first half of the ayah is shown; pick the rest.
  const complete = (i: number): ChallengeSpec | null => {
    const { start, end } = ownHalves[i];
    if (!end) return null;
    const seed = seedOf(ayat[i].key, "end");
    const right = [...ownHalves, ...restHalves]
      .filter((h) => h.start === start)
      .map((h) => h.end);
    const wrong = distractors(ownEnds, restEnds, [end, ...right], seed);
    if (!wrong) return null;
    return {
      prompt: ar ? "أكمل الآية" : "Complete the ayah",
      question: `${start} …`,
      sourceKey: ayat[i].key,
      options: options(end, wrong, seed),
    };
  };

  // Tap the ayah's words in order. Exams allow longer ayat.
  const order = (
    i: number,
    maxWords = ORDER_MAX_WORDS
  ): ChallengeSpec | null => {
    const w = ayahWords(own[i]);
    if (w.length < ORDER_MIN_WORDS || w.length > maxWords) return null;
    return {
      type: "ORDER",
      payload: { words: w },
      prompt: ar ? "رتّب كلمات الآية" : "Put the words in order",
      question: "",
      sourceKey: ayat[i].key,
      options: [],
    };
  };

  // Hear the recitation, pick the ayah.
  const listen = (i: number): ChallengeSpec | null => {
    if (!ayat[i].audioSrc) return null;
    const seed = seedOf(ayat[i].key, "listen");
    const wrong = distractors(own, rest, [own[i]], seed);
    if (!wrong) return null;
    return {
      type: "LISTEN",
      prompt: ar ? "استمع واختر الآية" : "Listen and choose the ayah",
      question: "",
      sourceKey: ayat[i].key,
      options: options(own[i], wrong, seed),
    };
  };

  // One word is missing; wrong choices are real words from other ayat.
  // The longest word is hidden: it is the most distinctive.
  const completeWord = (i: number): ChallengeSpec | null => {
    const w = ayahWords(own[i]);
    if (w.length < ORDER_MIN_WORDS) return null;
    const lengths = w.map((x) => normalizeArabic(x).length);
    const hide = lengths.indexOf(Math.max(...lengths));
    const answer = w[hide];
    const key = normalizeArabic(answer);
    const seed = seedOf(ayat[i].key, "word");
    // Words that read the same without diacritics would also be right.
    const notAnswer = (pool: typeof ownWords) =>
      pool.filter((x) => x.bare !== key).map((x) => x.w);
    const wrong = distractors(
      notAnswer(ownWords),
      notAnswer(restWords),
      [answer],
      seed
    );
    if (!wrong || new Set(wrong.map(normalizeArabic)).size < wrong.length)
      return null;
    return {
      type: "COMPLETE_WORD",
      payload: {
        before: w.slice(0, hide).join(" "),
        after: w.slice(hide + 1).join(" "),
        answer,
        mode: "choose",
      },
      prompt: ar ? "أكمل الكلمة الناقصة" : "Complete the missing word",
      question: "",
      sourceKey: ayat[i].key,
      options: options(answer, wrong, seed),
    };
  };

  // Recall with no options: one word is hidden and must be typed. Arabic
  // mode only (English learners may have no Arabic keyboard); matched
  // leniently (lib/arabic). Hides a different word from the
  // missing-word lesson, which always hides the longest.
  const typedWord = (i: number): ChallengeSpec | null => {
    if (!ar) return null;
    const w = ayahWords(own[i]);
    if (w.length < ORDER_MIN_WORDS) return null;
    const lengths = w.map((x) => normalizeArabic(x).length);
    const longest = lengths.indexOf(Math.max(...lengths));
    const candidates = w
      .map((_, k) => k)
      .filter((k) => k !== longest && lengths[k] >= 3);
    if (candidates.length === 0) return null;
    const [hide] = shuffle(candidates, seedOf(ayat[i].key, "typed"));
    return {
      type: "COMPLETE_WORD",
      payload: {
        before: w.slice(0, hide).join(" "),
        after: w.slice(hide + 1).join(" "),
        answer: w[hide],
        mode: "type",
      },
      prompt: "اكتب الكلمة الناقصة",
      question: "",
      sourceKey: ayat[i].key,
      options: [],
    };
  };

  // Which ayah comes before this one?
  const previous = (i: number): ChallengeSpec | null => {
    if (i < 1) return null;
    const seed = seedOf(ayat[i - 1].key, "previous");
    // If this ayah appears more than once, each ayah before it is right.
    const right = own
      .slice(1)
      .flatMap((o, k) => (o === own[i] ? [own[k]] : []));
    const wrong = distractors(own, rest, [own[i - 1], ...right, own[i]], seed);
    if (!wrong) return null;
    return {
      prompt: ar
        ? "ما الآية التي قبل هذه الآية؟"
        : "Which ayah comes before this one?",
      question: own[i],
      sourceKey: ayat[i - 1].key,
      options: options(own[i - 1], wrong, seed),
    };
  };

  // Does the second ayah come right after the first?
  const trueFalse = (i: number): ChallengeSpec | null => {
    if (i + 1 >= ayat.length) return null;
    const seed = seedOf(ayat[i + 1].key, "tf");
    const right = new Set([own[i + 1], ...followers(own[i])]);
    const [wrongNext] = pick(
      own.filter((t) => !right.has(t) && t !== own[i]),
      own[i + 1],
      1,
      seed
    );
    const isTrue = !wrongNext || shuffle([true, false], seed)[0];
    const second = isTrue ? own[i + 1] : wrongNext;
    return {
      type: "TRUE_FALSE",
      prompt: ar
        ? "هل تأتي الآية الثانية بعد الأولى مباشرة؟"
        : "Does the second ayah come right after the first?",
      question: `${own[i]}\n⬇\n${second}`,
      sourceKey: ayat[i + 1].key,
      // Always in this order: true, then false.
      options: [
        { text: ar ? "صح" : "True", correct: isTrue },
        { text: ar ? "خطأ" : "False", correct: !isTrue },
      ],
    };
  };

  // Match ayat to their numbers. Same-looking ayat are left out, so every
  // pair is unambiguous.
  const match = (indices: number[]): ChallengeSpec | null => {
    const seen = new Set<string>();
    const chosen = indices
      .filter((i) => {
        const left = excerpt(own[i]);
        if (seen.has(left)) return false;
        seen.add(left);
        return true;
      })
      .slice(0, MATCH_PAIRS);
    if (chosen.length < 3) return null;
    return {
      type: "MATCH",
      payload: {
        pairs: chosen.map((i) => ({
          left: excerpt(own[i]),
          right: num(lang, ayat[i].number),
        })),
      },
      prompt: ar ? "صِل كل آية برقمها" : "Match each ayah to its number",
      question: "",
      sourceKey: ayat[chosen[0]].key,
      options: [],
    };
  };

  /* ---------- Multi-ayah questions, for exams ---------- */

  // Two ayat are shown; which ayah comes after them?
  const passageNext = (i: number): ChallengeSpec | null => {
    if (i + 2 >= ayat.length) return null;
    const seed = seedOf(ayat[i + 2].key, "passage");
    // Any ayah that follows the same two ayat elsewhere is right too.
    const right = own
      .slice(0, -2)
      .flatMap((o, k) =>
        o === own[i] && own[k + 1] === own[i + 1] ? [own[k + 2]] : []
      );
    const wrong = distractors(
      own,
      rest,
      [own[i + 2], ...right, own[i], own[i + 1]],
      seed
    );
    if (!wrong) return null;
    return {
      prompt: ar
        ? "ما الآية التي تلي هذا المقطع؟"
        : "Which ayah comes after this passage?",
      question: `${own[i]}\n${own[i + 1]}`,
      sourceKey: ayat[i + 2].key,
      options: options(own[i + 2], wrong, seed),
    };
  };

  // An ayah, then the start of the next one; pick how it ends.
  const completePassage = (i: number): ChallengeSpec | null => {
    if (i + 1 >= ayat.length) return null;
    const { start, end } = ownHalves[i + 1];
    if (!end) return null;
    const seed = seedOf(ayat[i + 1].key, "passage-end");
    const right = [...ownHalves, ...restHalves]
      .filter((h) => h.start === start)
      .map((h) => h.end);
    const wrong = distractors(ownEnds, restEnds, [end, ...right], seed);
    if (!wrong) return null;
    return {
      prompt: ar ? "أكمل المقطع" : "Complete the passage",
      question: `${own[i]}\n${start} …`,
      sourceKey: ayat[i + 1].key,
      options: options(end, wrong, seed),
    };
  };

  // Put three consecutive ayat in order, each shown in full (no excerpts).
  const orderAyat = (i: number, count = 3): ChallengeSpec | null => {
    if (i + count > ayat.length) return null;
    const chips = own.slice(i, i + count);
    if (chips.some((t) => ayahWords(t).length > ORDER_AYAH_MAX_WORDS))
      return null;
    // Identical chips would make more than one order right.
    if (new Set(chips).size < chips.length) return null;
    return {
      type: "ORDER",
      payload: { words: chips },
      prompt: ar ? "رتّب الآيات" : "Put the ayat in order",
      question: "",
      sourceKey: ayat[i].key,
      options: [],
    };
  };

  return {
    next,
    previous,
    complete,
    order,
    typedWord,
    listen,
    completeWord,
    trueFalse,
    match,
    passageNext,
    completePassage,
    orderAyat,
  };
};

export type QuranQuestions = ReturnType<typeof quranQuestions>;
