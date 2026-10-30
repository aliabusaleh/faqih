# Content

Lessons are generated from primary texts by `npm run content:import`
(`scripts/import-content.ts`). Add `-- --refresh` to re-download.

| Course                           | Source                                                                                                | Citation shown                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Kids: Short Surahs               | Same Quran source; Al-Fatiha and An-Nas to Al-Fil                                                     | `Quran s:n`, links to quran.com                                                      |
| The Whole Quran                  | Same Quran source; all 114 surahs, a lesson per 5 ayat                                                | `Quran s:n`, links to quran.com                                                      |
| Quran: Al-Fatiha                 | [alquran.cloud](https://alquran.cloud/api): Uthmani text (Tanzil), Sahih International, Alafasy audio | `Quran 1:n`, links to quran.com                                                      |
| Hadith: an-Nawawi's Forty (1–10) | [fawazahmed0/hadith-api](https://github.com/fawazahmed0/hadith-api)                                   | `an-Nawawi's Forty Hadith #n` + takhrij (e.g. Bukhari & Muslim), links to sunnah.com |
| Adhkar: Morning & Evening        | [hisnmuslim.com API](https://www.hisnmuslim.com), Hisn al-Muslim ch. 27                               | `Hisn al-Muslim #id`, links to hisnmuslim.com                                        |

The import always loads the **full Quran** (114 surahs, 6,236 ayat) into
`source_texts` (keys `quran:<surah>:<ayah>`) and the `surahs` table, so any
course can use any ayah. The text is the Quran's **rasm**: Tanzil's Uthmani
script, spelled as in the mushaf (e.g. "عُمْىٌ", "وَبِٱلْءَاخِرَةِ"), everywhere,
kids included. It is shown in Amiri Quran (`font-quran`), a font made for
this text; other Arabic stays in Noto Naskh. Typed answers accept the
everyday spelling too (`lib/arabic.ts`). Quran.com's word-by-word audio is
numbered by these same Uthmani words, so every word has its audio. The
basmalah the edition puts before the first ayah of each surah is removed (it
is only an ayah in Al-Fatiha).

## Exercise types

Besides picking an option (`ASSIST`, `SELECT`), a challenge can be `LISTEN`,
`TRUE_FALSE`, `COMPLETE_WORD`, `COMPLETE_AYAH`, `ORDER` or `MATCH`. The
type-specific data lives in `challenges.payload` (see `lib/exercises.ts`).
The kids course generates all of them from the Quran text.

## Read first

Every lesson opens on the texts it is about (`lessons.study`, source keys in
order), so learners answer from what they've just read and heard instead of
guessing. Exams skip it.

- Quran lessons: the lesson's ayat plus the next one (which "what comes next"
  asks about); kids and Al-Fatiha lessons: the whole surah.
- Other courses: the texts the lesson's questions use, in order.
- Ayat are recited by a qari (never a synthetic voice); adhkar play their
  recording. With read-aloud on (kids by default) they play automatically.

Listening questions have a "Can't listen now" button: it skips the lesson's
listening questions without points or hearts.

## Daily review

What a learner has memorised comes back in a short daily review (spaced
repetition, `lib/review.ts`), at most 10 questions a day (5 for kids):

- An ayah (or hadith, dhikr) goes on the schedule the first time one of its
  questions is answered right, and is due the next day.
- A right first try moves it up a box: it comes back after 1, 3, 7, 14, 30,
  60, then 120 days. A wrong one brings it back the next day.
- No new questions are written for it: each due ayah is asked with one of
  the questions already in the lessons and exams about it, picked at
  random, from the courses of the learner's language and mode.
- No hearts are lost or earned; finishing it (or a lesson) counts the day
  for the streak.

## Exams

Every unit ends with an exam (`kind: "exam"`); passing it clears the unit
(see `lib/progress.ts`). Units can be taken in any order.

- **Quran surah exams** (`scripts/content/exams.ts`) spread over the whole
  surah: it is split into equal segments with one question each, so a long
  surah is covered from start to end. Size grows with the surah: one
  question per 10 ayat, at least 10 (or two per ayah for very short surahs)
  and at most 25, plus one ayat-to-numbers match. Exams use their own wrong
  answers, different from the lessons'.
  - **Full mode** mixes harder, exam-only kinds: type the missing word (no
    options), which ayah comes before, which ayah follows a two-ayah
    passage, complete the passage, order the words of ayat up to 15 words,
    order 4–5 ayat, plus what comes next and listening.
  - **Kids** keep to simple kinds they know from their lessons (next ayah,
    listen, complete the ayah, true/false, short word order); 8 questions,
    no typing.
- **Juz' exams** (`scripts/content/juz-exams.ts`, course "Juz' Exams",
  full mode): one 20-question exam per juz', spread across every surah in
  it, adding "which surah is this ayah from?" (never asked for an ayah that
  appears in more than one surah).
- Other courses (Al-Fatiha, an-Nawawi, adhkar) get an exam sampled from the
  unit's lessons.

## Read aloud and recitation

Lessons can be heard as well as read (Settings → Read aloud; on by default in
kids mode).

- **Quran is only ever recited by a qari**, never by a synthetic voice.
  `scripts/content/recitations.ts` marks which text is exactly an ayah
  (`challenges.read_aloud`, `challenge_options.recitation`, ORDER
  `recitations`) or exactly one word of an ayah. Fragments (half an ayah,
  MATCH excerpts) get no audio.
- Ayah audio comes from [EveryAyah](https://www.everyayah.com) at runtime,
  served first from the QuranicAudio CDN mirror (everyayah.com itself
  sometimes stalls), with everyayah.com as a fallback
  (`lib/recitation.ts`): al-Husary's teaching recitation (_muallim_) in kids
  mode, Alafasy in full mode. Free to use with attribution.
- Word audio is Quran.com's word-by-word recitation
  (`audio.qurancdn.com/wbw/SSS_AAA_WWW.mp3`). Word positions come from
  `ayahWords`, which matches Quran.com's word positions (checked on Al-Fatiha,
  Al-Baqarah, Al-Kahf, Ya-Sin, Al-Ikhlas and An-Nas). **Confirm the licence
  before a public launch.**
- The app's own words (instructions, "أحسنت!") use the browser's speech
  voice. With no voice for the language installed, they are skipped.

## Rules

- Every course is built twice: an Arabic course and an English course. There
  are no translation questions.
- The Quran is memorised in Arabic: Quran text is **always Arabic**, in
  English courses too. English courses differ in their instructions, and the
  app shows the English meaning (Sahih International) under each ayah in
  questions, options and "Read first". Hadith and adhkar English courses use
  the English text.
- Every challenge links to its `source_texts` row; the app shows the citation.
- Wrong answers are always other real texts or real values from the data.
  When a surah repeats an ayah (e.g. Al-Kafirun), every equally right answer
  is kept out of the wrong options, and a question without two distinct wrong
  answers is skipped.
- Every lesson is imported as `draft`. Only a qualified reviewer sets it to `reviewed`.
- `content/cache/` is gitignored: translations and audio are copyrighted.
  Get permission or use openly licensed translations before a public launch.

## Hisn al-Muslim references

The hisnmuslim.com API does not include each dhikr's hadith reference. A
reviewer adds them from the book's footnotes to
`references/hisn-al-muslim.json`, keyed by dhikr ID:

```json
{ "77": { "en": "Muslim 2723", "ar": "رواه مسلم ٢٧٢٣" } }
```

Only add a reference after checking it against the book and the hadith
collection. Never fill it in from memory.
