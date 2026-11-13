# Browser checks

Headless Microsoft Edge driven over the DevTools protocol, with no extra dependencies. Each script signs in as a demo user and
asserts what a person would see, printing `PASS` / `FAIL` lines and exiting non-zero on any failure.

Needs: Edge installed (path set in `cdp-lib.mjs`), the app running on port 3200 (`npm run build && npx next start -p 3200`), the local
database freshly seeded (`npm run db:reset`) and a `CRON_SECRET` in `.env.local` (for `batch`).

| Script     | Covers                                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------- |
| `auto`     | Auto-apply: consent required, applies, tags in My Applications, pause                                    |
| `batch`    | Cron endpoint auth, outcomes card, interview + calendar file, saved-search alerts, reports, admin verify |
| `draft`    | Unsaved profile draft is restored after a reload and cleared by saving                                   |
| `resume`   | New account uploads a PDF resume: the profile fills itself in, saves, and stays editable                  |
| `fit`      | Light theme by default, fonts, fit report on a job page, pasted-JD check                                |
| `persist`  | Still signed in after the web server restarts; sign-in remembers the email                               |

Run from the portal folder: `npm run e2e:auto`, `e2e:batch`, `e2e:draft`, `e2e:persist`. Reset the database between runs
(`npm run db:reset`): they change data.
