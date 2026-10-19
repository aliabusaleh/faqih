# Content

Lessons are generated from primary texts by `npm run content:import`
(`scripts/import-content.ts`). Add `-- --refresh` to re-download.

| Course                           | Source                                                                                                | Citation shown                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Quran: Al-Fatiha                 | [alquran.cloud](https://alquran.cloud/api): Uthmani text (Tanzil), Sahih International, Alafasy audio | `Quran 1:n`, links to quran.com                                                      |
| Hadith: an-Nawawi's Forty (1–10) | [fawazahmed0/hadith-api](https://github.com/fawazahmed0/hadith-api)                                   | `an-Nawawi's Forty Hadith #n` + takhrij (e.g. Bukhari & Muslim), links to sunnah.com |
| Adhkar: Morning & Evening        | [hisnmuslim.com API](https://www.hisnmuslim.com), Hisn al-Muslim ch. 27                               | `Hisn al-Muslim #id`, links to hisnmuslim.com                                        |

## Rules

- Every course is built twice: an Arabic course and an English course. A
  question and its options are always in one language; there are no
  translation questions.
- Every challenge links to its `source_texts` row; the app shows the citation.
- Wrong answers are always other real texts or real values from the data.
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
