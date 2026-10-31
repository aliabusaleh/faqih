# Faqih — Roadmap

> **Faqih: Learn the Quran**

A free, Duolingo-style app for learning the **Quran** in a few minutes a day:
short surahs for kids, then memorising the full Quran, then tajweed. It's
built on the open-source Lingo clone (Next.js 16, Drizzle, Neon Postgres,
Clerk).

Hadith, Fiqh and the wider Sirah are planned for later (see
[Later](#later)). Draft courses for an-Nawawi's Forty (1–10) and the morning
and evening adhkar already exist from M1.

## Principles

- **Arabic first.** The UI is in Arabic and right-to-left by default. An English
  version is one switch away.
- **Free knowledge.** No paywall on learning. Stripe stays off
  (`NEXT_PUBLIC_ENABLE_PAYMENTS`); donations may come later.
- **Easy access.** Short daily lessons, a guest mode with no sign-up, mobile
  first, works on slow connections.
- **Authentic and reviewed.** Every piece of content cites its source
  (surah:ayah; for stories, the source and its grading). Nothing goes live
  until a qualified reviewer has approved it.
- **Adab in the mechanics.** Wrong answers are always _other real_ ayat or
  words, never altered or made-up Quran text. There's no harsh "lose a life"
  on Quran memorisation, and leaderboards are opt-in.
- **Gentle for kids.** No hearts or penalties in the kids track. Use
  encouragement and rewards instead.
- **Authentic stories only.** Stories about the Prophet ﷺ and the Sahabah use
  sound reports only. Each story records its source and grading, and popular
  but weak stories are left out.

## Tracks (current focus)

| Track      | First content                                                                              | Exercise types                                                                 |
| ---------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Kids       | Al-Fatiha + last 10 surahs, short Prophet ﷺ and Sahabah stories, facts about the Prophet ﷺ | Listen and repeat, order the words, complete the word, story quiz, true/false  |
| Full Quran | All 114 surahs, generated from the Tanzil text, with difficulty levels                     | Complete the word, complete the ayah (choose or type), listen and pick, recite |
| Tajweed    | Core rules (noon sakinah & tanween, meem sakinah, madd, qalqalah…)                         | Spot the rule, listen and pick, rule ↔ example match                           |

## Milestones

Estimates assume one full-time developer. Part-time (evenings) is about
1.8× longer. **Kids MVP (M0–M4) ≈ 10–13 weeks full-time (≈ 4–6 months
part-time).** Full Quran adds ≈ 3–4 weeks, and Tajweed adds ≈ 3–4 weeks.

### M0 — Fork setup and rebrand (1 week) ✅

- Rebrand to Faqih (`APP_NAME` in `config/index.ts`) and add the track footer.
- Stripe behind a flag, off by default; the app runs without Stripe keys.
- Arabic fonts (Amiri Quran, Noto Naskh Arabic), `ArabicText`, and
  `dir="auto"` on lesson text.
- Local dev login (`NEXT_PUBLIC_DEV_AUTH=local`) so you don't need Clerk when
  running locally.
- ESLint fixed for ESLint 10 / eslint-config-next 16.

### M1 — Content model and pipeline ✅

- Schema: `courses.slug`, `track` (kids, quran, hadith, adhkar…), `language`
  and age range; `lessons.reviewStatus` (every import starts as `draft`); a
  `source_texts` table (Arabic, translation, citation, takhrij, link, audio);
  a `surahs` table; `challenges.sourceTextId` and `prompt`.
- `content:import` pulls from alquran.cloud (Tanzil Uthmani text, the rasm
  of the mushaf, Sahih International, Alafasy audio), fawazahmed0/hadith-api
  and hisnmuslim.com.
  Responses are cached in `content/cache/` (gitignored).
- The **full Quran** (114 surahs, 6,236 ayat) is imported as source texts, so
  every Quran question takes its text from the source by key
  (`quran:<surah>:<ayah>`); nothing is typed by hand.
- Draft courses, each in Arabic and English: **Kids: Short Surahs** (Al-Fatiha
  and An-Nas to Al-Fil), Al-Fatiha, an-Nawawi 1–10, and morning and evening
  adhkar.
- Every challenge shows its source and a draft warning. Drafts are hidden in
  production unless `NEXT_PUBLIC_SHOW_DRAFTS=true`.

### M1.5 — Arabic-first UI ✅ (mostly)

- Done in M1: Arabic by default, full RTL, logical margins, mirrored sidebar
  and arrows, Arabic-Indic digits, a typed UI dictionary (`lib/i18n.ts`), and
  an English ⇄ العربية switch saved in a cookie.
- Clerk's sign-in and sign-up screens are in Arabic too
  (`@clerk/localizations`).
- Arabic interface text uses Noto Naskh Arabic; Quran text uses Amiri Quran.
- Left: an RTL check of every new exercise screen from M2.

### M2 — Exercise engine and audio 🚧 _in progress_

**Done:**

- New challenge types, each with its own screen (`app/lesson/exercises/`):
  - `ORDER`: tap the ayah's words in order
  - `MATCH`: pair items from two columns (ayah ↔ number)
  - `COMPLETE_WORD`: one missing word, chosen or typed
  - `COMPLETE_AYAH`: type the rest of an ayah
  - `LISTEN`: hear the recitation, pick the ayah
  - `TRUE_FALSE`: does this ayah come next?
- Typed Arabic answers are matched leniently (`lib/arabic.ts`): no diacritics
  needed, and the Uthmani or everyday spelling is accepted.
- Audio player with normal and slow replay.
- The kids course uses every type. `LISTEN` and `COMPLETE_WORD` are Arabic
  only, so the English course has no translation questions.

- **Exams and free order** (`lib/progress.ts`): every unit ends with an
  exam, and **every surah is open**: learners start anywhere, with a "Jump
  to" picker on the learn page. A surah is **cleared** when its exam is
  passed or all its lessons are done; moving past it without either leaves
  it unfinished. Inside a surah that isn't cleared, lessons open one by one,
  and the exam once they are all done (read and learn first, then be
  tested). Once cleared, all its lessons are open to practise.
- **Read, then answer**: a Quran lesson goes two ayat at a time: read them
  (heard to the end, or time to read them, before the questions open), then
  only their questions; it ends with a review of the whole lesson. "Read the
  ayat again" during the questions goes back to them.
- **Kids / full mode**, a per-device setting (Settings page and tour):
  - Kids: only kids courses, no hearts, no shop, leaderboard or quests, bigger
    cards and buttons, no keyboard-shortcut badges.
  - Full: every other course, with hearts.
- **Welcome tour** on the first visit, with Skip on every step and a
  kids/full choice at the end. Settings can show it again.

- **Read aloud** (Settings and tour; on by default in kids mode): each
  question's instruction is spoken and its ayat recited when it opens, with
  a 🔊 replay button; tapping an option or a word chip recites that ayah or
  word; "أحسنت!" / "حاول مرة أخرى" after each answer. Quran is only ever
  recited by a qari (al-Husary _muallim_ for kids, Alafasy otherwise), never
  synthesised. Questions are announced to screen readers (`aria-live`).

**Left:**

- Repeat-N-times audio for kids who can't read yet.
- Rewards and stickers for kids.
- Audio for MATCH items and ayah fragments.

### M3 — Kids track (3–4 weeks, runs alongside M2; content is the bottleneck)

- Al-Fatiha and the last 10 surahs: listen, repeat, order and complete.
- ✅ Repetition through a spaced-repetition review queue, plus a daily goal and
  streak.
- Short stories of the Prophet ﷺ and the Sahabah, each with a short quiz.
- Short facts about the Prophet ﷺ (family, Makkah and Madinah, character).
- Parent-managed profiles or guest mode, so children don't need their own
  account. Progress is saved on the device and can be merged into a parent
  account later (built on the local-auth wrapper from M0).
- Scholarly review of every lesson and story before it's published.

### M4 — Beta launch (2–3 weeks)

- Installable PWA with offline lessons.
- Accessibility pass: keyboard, screen readers, contrast (started: questions
  are announced to screen readers, audio buttons are labelled).
- Performance budget for low-end phones.
- ✅ Deployed on a free host: Vercel Hobby with Neon Postgres. Schema changes
  apply automatically on merge (`.github/workflows/db-push.yml`).
- Closed beta with 50–100 families from the local community.
- Privacy-respecting analytics and error reporting.
- Feedback loop and a process for reporting content corrections.

### M5 — Full Quran 🚧 _started_

- ✅ **The Whole Quran** course (Arabic and English meaning): 114 units in
  mushaf order, a lesson per 5 ayat mixing question types, and an exam per
  surah that grows with its length (10–25 questions, spread over the whole
  surah) and mixes harder, exam-only kinds: type the missing word, the ayah
  before, passages, long orderings.
- ✅ **Juz' Exams** course: one 20-question exam per juz', across all its
  surahs, including "which surah is this ayah from?".
- Difficulty levels: hide 1 word → hide several words → first-letter hints →
  the whole ayah.
- Typed Arabic answers with an on-screen Arabic keyboard. Matching ignores
  diacritics and letter variants (hamza/alif forms, ta marbuta).
- Surah recitation: play ayah by ayah, with repeat and slow replay.
- ✅ Hifz review queue across the whole Quran (the daily review, per ayah;
  `content/README.md`).
- Opt-in leaderboard and themed quests (e.g. "complete Juz Amma").

### M6 — Tajweed (3–4 weeks)

- Colour-coded tajweed text (check the license of the tajweed data source).
- Explanation and audio examples for each rule.
- Exercises: spot the rule in an ayah, listen and pick the rule, and match
  rules to examples.
- Review by teachers qualified in tajweed.

## Later

- **Licensing:** clear the English translation and audio licences (or switch
  to openly licensed ones) before a public launch.
- Recitation feedback using speech recognition (hard; research spike first).
- **Hadith** track beyond the draft an-Nawawi 1–10 course.
- **Sirah** beyond the kids' stories (Makkan and Madinan periods, timelines).
- **Quranic Arabic** vocabulary (most frequent Quranic words).
- **Faqih level:** fiqh rulings, Mahr, inheritance (needs a rules engine), and
  a policy on madhhab (follow one, or show the differences).
- Native app wrapper (Capacitor/Expo).
- A content CMS for reviewers.
- More UI languages (Urdu, Indonesian, Turkish, French…).

## Hosting (free)

| Option                                              | Fits now?      | Notes                                                                                                                                                                                                     |
| --------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cloudflare Workers** via `@opennextjs/cloudflare` | ✅ Recommended | The free plan covers server actions, middleware and Neon over HTTP. The Worker bundle must stay under 3 MiB on the free plan, so dropping Stripe and react-admin from the public bundle helps.            |
| Vercel Hobby                                        | ✅             | Zero-config for Next.js. Free tier is for non-commercial use only.                                                                                                                                        |
| GitHub Pages                                        | ❌ as-is       | Static files only: no server actions, API routes, auth or database. It would need a static-export rewrite (content as JSON, progress in localStorage). That could suit a guest-only "lite" edition later. |

Neon (free Postgres) and Clerk (free tier) cover the database and auth for the
beta.

## Risks

| Risk                                | Mitigation                                                                               |
| ----------------------------------- | ---------------------------------------------------------------------------------------- |
| Content errors or weak sources      | Reviewer sign-off gate, a source on every item, a public "report a correction" button    |
| Weak or fabricated stories          | Sound reports only, source and grading recorded per story, reviewed before publishing    |
| Text, audio and tajweed licensing   | Use openly licensed sources only, keep an attribution page, track licenses per source    |
| Content production is slow          | Generate full-Quran exercises from the text, start narrow (Juz Amma), recruit volunteers |
| Gamification clashes with reverence | Adab rules above; review mechanics with the scholars                                     |
| Children's privacy                  | No child accounts; parent-managed profiles or on-device progress, minimal data collected |
| Free-tier limits                    | Keep the bundle small, cache content, and monitor usage                                  |

## Name

**Faqih** (فقيه) means "one who has deep understanding". It recalls the hadith
"Whoever Allah wants good for, He gives understanding of the religion"
(Bukhari & Muslim). The current focus is the Quran, so the name appears with
the tagline **"Learn the Quran"**. A Faqih level (fiqh) is planned for later.

## Open decisions

- Age range for the kids track (5–10 for now).
- Reciter for the audio (e.g. Al-Husary's _muallim_ recitation for kids).
- Riwayah: Hafs 'an 'Asim by default; whether to support others later.
- Which reviewers or scholars sign off on content (Quran, stories, tajweed).
- When to update the tagline in `config/index.ts` (still "Learn Quran,
  Hadith & Sirah" in M0).
