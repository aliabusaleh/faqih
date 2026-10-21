# Setup and deployment

## Requirements

| Requirement | Version                                    | Notes                                     |
| ----------- | ------------------------------------------ | ----------------------------------------- |
| Node.js     | 20.9 or newer                              | Next.js 16 minimum                        |
| Bun         | 1.3.4 (`packageManager` in `package.json`) | Installs the exact versions in `bun.lock` |
| PostgreSQL  | Neon (free tier) or any Postgres 15+       | `DATABASE_URL` in `.env`                  |

`package.json` lists the dependencies and `bun.lock` pins their exact
versions, the same way `requirements.txt` with pinned versions works for
Python. Always install from the lock file so every machine gets the same
versions:

```bash
bun install --frozen-lockfile
```

Without Bun installed globally, `npx bun@1.3.4 install --frozen-lockfile`
does the same. Don't use `npm install`: it ignores `bun.lock`, resolves newer
versions, and fails on react-admin's peer dependencies.

## First run

1. Copy `.env.example` to `.env` and fill in `DATABASE_URL`. For local
   development without Clerk, set `NEXT_PUBLIC_DEV_AUTH=local`.
2. Create the tables: `bun run db:push`
3. Import the sources and build the courses: `bun run content:import`
   - The first run downloads the full Quran (Arabic, English and audio links),
     an-Nawawi's Forty and Hisn al-Muslim into `content/cache/`. Later runs
     reuse the cache; add `-- --refresh` to download again.
   - It replaces all courses, which resets everyone's progress.
4. Start the app: `bun run dev`

See [content/README.md](../content/README.md) for the sources and the
content rules.

## Draft content

Every imported lesson starts as `draft`. Drafts always show in development.
In production only `reviewed` lessons show, unless
`NEXT_PUBLIC_SHOW_DRAFTS=true` (for example on a reviewers' staging site).

## Database updates after a merge

When a merge to `main` changes the schema (`db/schema.ts`, or the files it
imports: `lib/exercises.ts`, `constants.ts`), the **Update database schema**
GitHub Action (`.github/workflows/db-push.yml`) runs `drizzle-kit push`
against the database in the `DATABASE_URL` repository secret.

- One-time setup: add `DATABASE_URL` under GitHub → Settings → Secrets and
  variables → Actions.
- Safe changes (new tables, columns, enum values) apply automatically.
  Changes that could delete data make the job fail on purpose; run
  `npx drizzle-kit push` yourself after checking what will be lost.
- It only updates the schema. If the change also needs new or rebuilt lessons,
  run `npm run content:import` yourself (it resets progress).
- You can also run it by hand from the Actions tab ("Run workflow").
