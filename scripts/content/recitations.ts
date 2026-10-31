import { type OrderPayload, type ReadAloud } from "@/lib/exercises";

import { type ChallengeSpec, type CourseSpec } from "./courses";
import { ayahWords } from "./quran-questions";
import { type SourceText } from "./sources";

// Marks which Quran text in a course can be heard as real recitation
// (lib/recitation builds the audio URLs at runtime):
// - a question line or an option that is exactly an ayah -> that ayah
// - an option or a word-order chip that is exactly one word of an ayah ->
//   that word (Quran.com word-by-word audio)
// - an ayah-order chip (an ayah, or the start of one ending in "…") -> that
//   ayah
// Anything else, like half an ayah or a MATCH excerpt, gets no audio:
// recitation of a fragment doesn't exist, and Quran text is never given to a
// synthetic voice.
//
// Every course: Quran text is Arabic in English courses too.

const ELLIPSIS = " …";

type Index = {
  /** Ayah text -> refs ("s:a"); an ayah can repeat across the Quran. */
  ayat: Map<string, string[]>;
  /** Word text -> first ref ("s:a:w"). Same spelling, same recitation. */
  words: Map<string, string>;
  /** "s:a" -> ayah text. */
  text: Map<string, string>;
};

export const buildRecitationIndex = (quran: SourceText[]): Index => {
  const index: Index = { ayat: new Map(), words: new Map(), text: new Map() };
  for (const ayah of quran) {
    const ref = `${ayah.surah}:${ayah.number}`;
    index.text.set(ref, ayah.arabic);
    index.ayat.set(ayah.arabic, [...(index.ayat.get(ayah.arabic) ?? []), ref]);
    // Word audio is numbered by the ayah's Uthmani words, the words shown.
    ayahWords(ayah.arabic).forEach((word, k) => {
      if (!index.words.has(word)) index.words.set(word, `${ref}:${k + 1}`);
    });
  }
  return index;
};

/** "quran:2:255" -> 2, else null. */
const surahOf = (sourceKey: string) => {
  const match = /^quran:(\d+):\d+$/.exec(sourceKey);
  return match ? Number(match[1]) : null;
};

const attachToChallenge = (
  challenge: ChallengeSpec,
  index: Index
): ChallengeSpec => {
  const surah = surahOf(challenge.sourceKey);
  // Prefer the challenge's own surah when the same ayah appears elsewhere.
  const ayahRef = (text: string) => {
    const refs = index.ayat.get(text);
    if (!refs) return undefined;
    return refs.find((r) => r.startsWith(`${surah}:`)) ?? refs[0];
  };
  const recitationOf = (text: string) => ayahRef(text) ?? index.words.get(text);

  const questionAyat = challenge.question
    .split("\n")
    .map(ayahRef)
    .filter((r): r is string => !!r);
  const readAloud: ReadAloud | undefined = questionAyat.length
    ? { ayat: questionAyat }
    : undefined;

  const options = challenge.options.map((option) => ({
    ...option,
    recitation: recitationOf(option.text),
  }));

  let payload = challenge.payload;
  if (challenge.type === "ORDER" && payload) {
    const { words } = payload as OrderPayload;
    const recitations = words.map((chip) => {
      // A whole word, a whole ayah, or the start of an ayah ("… ").
      const direct = recitationOf(chip);
      if (direct) return direct;
      if (!chip.endsWith(ELLIPSIS)) return null;
      const start = chip.slice(0, -ELLIPSIS.length);
      const refs = [...index.text.entries()].filter(
        ([ref, text]) =>
          text.startsWith(`${start} `) && ref.startsWith(`${surah}:`)
      );
      return refs.length === 1 ? refs[0][0] : null;
    });
    if (recitations.some(Boolean))
      payload = { ...(payload as OrderPayload), recitations };
  }
  return { ...challenge, readAloud, options, payload };
};

export const withRecitations = (
  course: CourseSpec,
  index: Index
): CourseSpec => ({
  ...course,
  units: course.units.map((unit) => ({
    ...unit,
    lessons: unit.lessons.map((lesson) => ({
      ...lesson,
      challenges: lesson.challenges.map((c) => attachToChallenge(c, index)),
    })),
  })),
});
