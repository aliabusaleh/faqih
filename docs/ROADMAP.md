# Faqih — Roadmap

> **Faqih: Learn Quran, Hadith & Sirah**

A free, Duolingo-style app for learning the **Quran, Hadith and Sirah** in a few
minutes a day. It's built on the open-source Lingo clone (Next.js 16, Drizzle,
Neon Postgres, Clerk).

## Principles

- **Free knowledge.** No paywall on learning. Stripe stays off
  (`NEXT_PUBLIC_ENABLE_PAYMENTS`); donations may come later.
- **Easy access.** Short daily lessons, a guest mode with no sign-up, mobile
  first, works on slow connections, Arabic and RTL support.
- **Authentic and reviewed.** Every piece of content cites its source (surah:ayah,
  hadith collection + number + grading). Nothing goes live until a qualified
  reviewer has approved it.
- **Adab in the mechanics.** Wrong answers are always _other real_ ayat or
  hadith, never altered or made-up Quran or hadith text. There's no harsh
  "lose a life" on Quran memorisation, and leaderboards are opt-in.

## Tracks

| Track            | First content (MVP)                                              | Exercise types                                         |
| ---------------- | ---------------------------------------------------------------- | ------------------------------------------------------ |
| Quran            | Al-Fatiha + last 10 surahs: word meanings, ayah order, listening | Match word ↔ meaning, order the words, listen and pick |
| Hadith           | First 10 of an-Nawawi's 40                                       | Fill the blank, who narrated it, meaning, lessons      |
| Sirah            | Makkan period, unit 1                                            | Put events in order, true/false, people and places     |
| Arabic (Quranic) | 100 most frequent Quranic words                                  | Flashcards, match, listen                              |
| Fiqh basics      | Wudu and Salah steps                                             | Put the steps in order, pick the correct step          |

## Milestones

Estimates assume one full-time developer. Part-time (evenings) is about
1.8× longer. **MVP ≈ 12–15 weeks full-time (≈ 5–7 months part-time).**

### M0 — Fork setup and rebrand (1 week) ✅ _this PR_

- Rebrand to Faqih (`APP_NAME` in `config/index.ts`) and add the track footer.
- Stripe behind a flag, off by default; the app runs without Stripe keys.
- Arabic fonts (Amiri Quran, Noto Naskh Arabic), `ArabicText`, and
  `dir="auto"` on lesson text.
- Local dev login (`NEXT_PUBLIC_DEV_AUTH=local`) so you don't need Clerk when
  running locally.
- ESLint fixed for ESLint 10 / eslint-config-next 16.

### M1 — Content model and pipeline (2 weeks) 🚧 _in progress_

**Done (branch `m1-content`):**

- Schema: `courses.slug`/`track`, `lessons.reviewStatus` (all imports start as
  `draft`), a `source_texts` table (Arabic, translation, citation, takhrij,
  link, audio), and `challenges.sourceTextId`/`prompt`.
- `npm run content:import` pulls from alquran.cloud, fawazahmed0/hadith-api and
  the hisnmuslim.com API and builds three draft courses: Al-Fatiha, an-Nawawi
  1–10, and morning and evening adhkar.
- Every challenge shows its source and links to it, plus a draft warning. Drafts are hidden in
  production unless `NEXT_PUBLIC_SHOW_DRAFTS=true`.
- **One language at a time:** a switch between English and العربية (full RTL UI).
  Each course is built separately for each language, and every question and
  its options are in that one language, so there are no translation questions.
- Hisn al-Muslim takhrij is still to do: the API has none, so reviewers add
  references in `content/references/hisn-al-muslim.json`.

**Original scope:**

- Generalise the schema:
  - `courses.slug` and `courses.track`
  - challenge types beyond SELECT/ASSIST
  - a `payload jsonb` field for type-specific data
  - source references (surah/ayah, hadith collection/number/grade)
  - a `reviewStatus` per lesson
- Keep content as code: YAML/JSON lesson files in the repo, with an importer
  that replaces `scripts/prod.ts`.
- Import base texts from licensed sources:
  - Quran text from Tanzil (Uthmani)
  - recitation audio from EveryAyah / Quran Foundation, with attribution
  - hadith from sunnah.com
  - license and attribution for every translation used

### M2 — Exercise engine (2–3 weeks)

- New challenge types:
  - `MATCH` (pairs)
  - `ORDER` (arrange words or events)
  - `FILL_BLANK`
  - `LISTEN` (audio → pick the ayah)
  - `TRUE_FALSE`
  - `TIMELINE` (Sirah)
- Audio player with per-ayah clips, plus slow replay.
- Right-to-left layouts for Arabic-first challenges.

### M3 — MVP content (3–4 weeks, runs alongside M2; content is the bottleneck)

- Al-Fatiha and the last 10 surahs, 10 of Nawawi's 40 Hadith, Sirah unit 1,
  and Wudu/Salah basics.
- Scholarly review of every lesson before it's published.

### M4 — Engagement redesigned with adab (1–2 weeks)

- Daily streak and daily goal.
- Hearts replaced by "review" on Quran tracks.
- Opt-in leaderboard.
- Themed quests (e.g. "complete Juz Amma vocabulary").
- Spaced-repetition review queue for memorisation (hifz).

### M5 — Easy access (2 weeks)

- **Guest mode:** progress is saved on the device and can be merged into an
  account later (built on the local-auth wrapper from M0).
- Installable PWA with offline lessons.
- Arabic UI locale (full RTL) and i18n scaffold.
- Accessibility pass: keyboard, screen readers, contrast.
- Performance budget for low-end phones.

### M6 — Beta launch (1–2 weeks)

- Deploy to a free host (see Hosting below).
- Closed beta with 50–100 people from the local community.
- Privacy-respecting analytics and error reporting.
- Feedback loop and a process for reporting content corrections.

### After the MVP

- Recitation feedback using speech recognition (hard; research spike first).
- Native app wrapper (Capacitor/Expo).
- A content CMS for reviewers.
- Kids mode and family groups.
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

| Risk                                | Mitigation                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------- |
| Content errors or weak sources      | Reviewer sign-off gate, a source on every item, a public "report a correction" button |
| Translation and audio licensing     | Use openly licensed sources only, keep an attribution page, track licenses per source |
| Content production is slow          | Content-as-code templates, start narrow (Juz Amma), recruit volunteers                |
| Gamification clashes with reverence | Adab rules above; review mechanics with the scholars                                  |
| Free-tier limits                    | Keep the bundle small, cache content, and monitor usage                               |

## Name

**Faqih** (فقيه) means "one who has deep understanding". It recalls the hadith "Whoever Allah wants good for, He gives understanding of the religion" (Bukhari & Muslim). Since _faqih_ is usually read as "jurist", the name always appears with the tagline **"Learn Quran, Hadith & Sirah"**.

## Open decisions

- Target audience first: new Muslims, kids, or Arabic learners?
- UI languages at launch.
- Which reviewers or scholars sign off on content.
