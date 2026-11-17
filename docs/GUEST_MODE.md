# Guest mode (design note)

**Status:** a proposal for comment. There is no code yet.

## Why

The board card "Parent-managed profiles and guest mode" (P0, M3) asks for
two things: children never need their own account, and a visitor can learn
without signing up. Today every page except the home page asks for a sign-in,
which is the biggest step between a visitor and their first ayah.

This note covers the first half, **guest mode**. Child profiles under a
parent's account come in a second pull request (see the end).

## How it works

1. The home page gets a **"Try without an account"** button next to "Get
   started". It calls a server action that creates a guest id and keeps it in a
   cookie:
   - the id is `guest_` followed by 32 random hex characters
     (`crypto.randomUUID()`, without the dashes);
   - the cookie is `guest`: httpOnly, secure, SameSite=Lax, kept for one year;
   - nothing is written to the database yet.
2. `getAuth()` (`lib/auth.ts`) returns:
   - the Clerk user when someone is signed in;
   - otherwise, the guest id, if the cookie holds a well-formed one;
   - otherwise, null, as today.

   Everything stored per learner uses `user_id` and goes through `getAuth()`,
   so it all works for guests unchanged. That covers progress, mistakes, the
   daily review, the streak and reminders, and offline use too.

3. `proxy.ts` lets a request through when it carries a well-formed guest
   cookie. Without one, it asks for a sign-in as now.
4. `getCurrentUser()` returns a guest with the name "Guest" (ضيف) and the
   mascot picture, and no email.

Only ids that start with `guest_` and have the right length are accepted from
the cookie. A cookie can never stand in for a real account, because Clerk
ids start with `user_`.

## What guests can't do

- **Leaderboard:** guests have no name, so they are left out of it. They see
  a note: "Sign up to join the leaderboard".
- **Shop and subscriptions:** off for now anyway. Guests can't subscribe.
- **Admin:** never. Admin ids are Clerk ids.

## Signing up keeps the progress

When a signed-in request still carries a guest cookie, the guest's rows move
to the account, once, and then the cookie is cleared. This touches six tables:
`user_progress`, `challenge_progress`, `mistakes`, `review_items`,
`push_subscriptions` and `user_subscription`. The last one is always empty
for guests.

- **Account with no progress yet** (the usual case, a new sign-up): every
  guest row is re-keyed to the account id.
- **Account that already has progress** (signing in on a new device after
  trying as a guest), the rows are merged:
  - answers, mistakes and review schedules are added where the account has
    none (`on conflict do nothing`);
  - points add up, and the streak keeps the higher of the two;
  - the account's active course and hearts stay.

The merge runs in a small route, `/welcome`, that Clerk redirects to after
signing in or up. It merges, then redirects to `/learn`. To route there,
`NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` and
`NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` change from `/` to
`/welcome`.

## Privacy

- No name, email or picture is stored for a guest.
- The id belongs to a browser's cookie, not to a person.
- Clearing the browser's cookies loses a guest's progress. A small banner for
  guests says so, and offers to sign up to keep it.

## Old guests

Guests who never come back leave rows behind. The proposal: a monthly
cleanup deletes guests with no activity for 12 months. It would run as a new
cron route, like the reminders, protected by `CRON_SECRET`.

## Abuse

Creating a guest id writes nothing. Rows are written only once a course is
chosen and questions are answered, exactly as for a signed-in learner. For
the beta, Vercel's own protections and the yearly cleanup should be enough.

## Testing

- **Unit checks:** the cookie check (well-formed or not, guest or not) and
  the merge rules. Both are pure functions, so they can be checked without a
  database.
- **Locally:** local dev login (`NEXT_PUBLIC_DEV_AUTH=local`) signs everyone
  in as the dev user. In development, a guest cookie would take precedence, so
  both paths can be tried in one browser.

## Questions for Ali

1. Is a guest stored on the server under an anonymous id fine? The other way
   is to keep a guest's progress only in the browser until sign-up. That is
   more private, but every server action (answers, hearts, the daily review,
   the streak) would need a browser copy, which is several times the work.
2. Cleanup: delete guests with no activity for 12 months?
3. Are the merge rules right for an account that already has progress?
4. Where should "Try without an account" go: only the home page, or also
   the sign-in screen? And is the guest banner's wording right?

## Next: child profiles

Under a parent's account: "Who is learning?" with a profile per child. Each
profile has its own progress and is never on the leaderboard. It would use
the same approach: progress is stored under a profile id instead of the
account id, and `getAuth()` returns the chosen profile. A guest could also be
saved as a child profile when the parent signs up.
