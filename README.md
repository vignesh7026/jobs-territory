# Jobs Territory: candidate portal

A candidate-facing job platform. Sign up, build a profile, search jobs with filters that live in the URL, apply with
a cover note, and follow every application on a timeline. Around that core sit the features that make it more than a
listing site: match scores with honest explanations, skill-gap analysis, application health, a mock interview, a
learning roadmap, contact profiles for recruiters and founders, and blind (anonymous) applying.

Built with Next.js 16 (App Router, TypeScript strict), Tailwind, Framer Motion, Supabase (Postgres, Auth, Storage, row-level
security) and Zod. AI features call a model from the server only.

**Live demo:** https://jobs-territory-ten.vercel.app (hosted on Vercel and Supabase; see DEPLOY.md). Smoke test: `node e2e/live.mjs <url>`.

> All companies, people, jobs, emails and interview notes in the seed data are fictional. Emails use the reserved
> `.example` domain. Nothing in the app can reach a real person.

## Run it

You need Node 20+, Docker Desktop (for local Supabase), and a few minutes.

```bash
npm install
cp .env.example .env.local      # the defaults work for local Supabase
npm run db:start                # starts local Postgres, Auth, Storage in Docker
npm run db:reset                # applies migrations and loads the seed data
npm run dev                     # http://localhost:3000
```

For a production build: `npm run build && npm start`.

### Demo logins

| Role      | Email                           | Password            |
| --------- | ------------------------------- | ------------------- |
| Candidate | `demo@jobsterritory.example`    | `Demo-Candidate-26` |
| Admin     | `admin@jobsterritory.example`   | `Demo-Admin-26`     |

The candidate (Meera Krishnan) has six applications at different stages. The admin can change statuses at
`/admin/applications`; every change writes a timeline event.

### Environment variables

| Variable                        | Where       | Purpose                                                                               |
| ------------------------------- | ----------- | ------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | browser     | Supabase API URL                                                                      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser     | Public key; row-level security is what protects data                                  |
| `SUPABASE_SERVICE_ROLE_KEY`     | server only | Used for the AI cache table and nothing else                                          |
| `GROQ_API_KEY`                  | server only | Optional. AI provider (default model `openai/gpt-oss-120b`, override with `GROQ_MODEL`) |
| `ANTHROPIC_API_KEY`             | server only | Optional. Used if `GROQ_API_KEY` is empty (`ANTHROPIC_MODEL` to override)             |
| `CRON_SECRET`                  | server only | Optional. Enables the scheduled auto-apply endpoint; leave empty to keep it off        |

With no AI key set, every AI feature falls back to a plain, rule-based result and says so. `.env.local` is git-ignored.
Never put a key in a `NEXT_PUBLIC_` variable.

## What is in it

**Core**
- Registration, sign-in, sign-out; protected routes; profile with skills, experience, education, optional PDF resume (2 MB).
- Jobs list: keyword (full-text, prefix match), location, type, work mode, level, sort, pagination, all in the URL;
  job detail; saved jobs and saved searches; compare two or three jobs side by side.
- Apply with an optional cover note; a second application to the same job is refused with a 409 "Already applied"; undo for ten minutes.
- My Applications as a list or a board; a timeline (Applied, Under Review, Shortlisted, Interview, Offered, Rejected);
  an admin page that moves status and writes an event row each time.
- Command palette (Ctrl+K).

**AI features** (server-side, structured JSON, cached by job and profile version, always with a plain fallback; the
candidate can edit or dismiss anything; nothing is ever sent automatically)
- Match score with a two-line explanation; "Why you might not get this"; skill-gap advice.
- Three-line job summary; cover letter draft; follow-up email draft.
- Application health: On track, Follow up now, Likely ghosted (rule-based from days since the last update).

**Beyond the brief**
- **Contact profiles:** a profile page for every recruiter and founder, how fast the company replies (from real
  application histories), and an editable first message you copy or open in your mail app.
- **Listing check:** flags listings that are very old, repeatedly reposted or vague, with the real numbers.
- **Quick apply:** a filter for jobs you match at 60% or more and have not applied to, with a one-tap button and undo.
- **Salary negotiator:** when an application reaches Offered, a market range from comparable listings and a draft reply.
- **Voice profile builder:** speak (or type) for a minute; headline, summary and skills are drafted from your words only.
- **Mock interview:** five questions for a job, two minutes each, scored for clarity, structure and specificity.
- **Career page:** an animated path of your experience, the next level up, and a week-by-week learning plan you tick off.
- **Portfolio-aware skills:** suggests skills from your public GitHub repositories (languages, topics, descriptions).
- **Anonymous applying:** hide your name, college, employers and resume from reviewers until you are shortlisted.
- **Interview experiences:** anonymous notes from people who applied to a company, summarised in three lines.
- **Referral finder:** alumni from your college at the company, and people you know there, with draft messages.
- **Auto-apply:** pick roles and places; the server applies for you to matching jobs within a match floor, a daily cap and (by default) verified companies only. Stale or vague listings are skipped, every automatic application is tagged and undoable for 10 minutes, and a pause switch stops it at once.
- **Reports and moderation:** report a job, company or interview note; three different reporters hide a note automatically; admins work a queue (dismiss, or close the listing / remove verification / hide the note).
- **Admin verification screen and verified-only filter:** admins verify a company with a note on how it was checked; candidates can hide unverified companies.
- **Saved-search alerts:** each saved search shows how many matching jobs were posted since you last opened it.
- **Interview date:** record when it is; download a calendar file with reminders a day and an hour before.
- **Outcomes card:** reply rate, typical wait, applications waiting longer than usual, and auto-applied vs hand-applied, from your own history only.
- **Scheduled auto-apply:** `GET /api/cron/auto-apply` (secret-protected) runs every enabled rule; optional short cover note built from real matching skills.
- **Company verification:** every company shows Verified or Not verified; unverified ones carry a warning.

## Tests

```bash
npm test                    # unit tests (306)
npm run test:integration    # against local Supabase (52); run `npm run db:reset` first
npm run db:test             # SQL security checks (row-level security, blind review, privacy); reset first
npm run lint && npm run typecheck
npm run e2e:batch           # headless-Edge browser checks (see e2e/README.md); also e2e:auto, e2e:draft, e2e:persist
```

The security checks assert, in the database itself: candidates see only their own profile, applications and plans;
status cannot be written by a candidate; admins cannot read a blind candidate's profile or resume until shortlisting;
interview-note authors are never exposed; anonymous visitors read only jobs and companies.

## Design and motion

Design tokens (colour, type, spacing, radius) follow the brief and live in `app/globals.css` and `tailwind.config.ts`.
One deliberate deviation: the brief's exact status and semantic colours fail WCAG AA as *text* on the page background.
Fills, borders and icons keep the exact values; text uses a slightly darker or lighter variant (`-fg`) of the same hue,
enforced by `tests/contrast.test.ts`. Status is always icon plus label, never colour alone.

Motion is functional: 150 to 300 ms ease-out, transform and opacity only, respecting `prefers-reduced-motion`.
Job cards tilt a few degrees toward the mouse; the logo and title morph between a job row and its page (browser View
Transitions API, Chromium-family browsers, plain navigation elsewhere); a 200 ms fade and 8 px rise on route changes;
the home page has a short product demo that plays once and rests on its last frame.

## How AI tools were used

Built with Claude Code as a pair: it wrote the code, tests and SQL; the decisions (what to build, which rules to keep,
what to leave out) were reviewed each step, one feature per commit with the edge cases listed in each commit message.
The product itself uses a hosted model (Groq or Anthropic, chosen by which key is set) for the AI features above.
Safeguards, all tested: prompts treat profile and job text as untrusted data; they forbid inventing facts; outputs are
validated against a Zod schema and anything that fails falls back to the plain result; the model only ever sees a
first name, never email, phone or surname; links in learning plans are never model output (a fixed table supplies them);
skills proposed from a voice transcript are filtered to those actually spoken.

## Decisions and deviations

- **Dependencies beyond the brief** (each needed): `@supabase/ssr` and `@supabase/supabase-js` (auth and data),
  `server-only` (keeps server code out of the browser bundle), `vitest` (tests), the `supabase` CLI (local database, dev only),
  `@types/node@24` (peer requirement). The command palette, confetti and every chart are hand-built, not libraries.
- **No React Three Fiber hero.** A short, accurate product demo replaced it: it shows the real product and costs no
  extra JavaScript. Revisit if a 3D scene is wanted.
- **Zod 4** and **Next.js 16** conventions (`proxy.ts` instead of middleware, async `params`).
- **Fictional data.** Recruiter and founder profiles, employees and the interview notes marked "Sample" are demo data.

## Known limits

- The reply-time and market-range figures are only as good as the number of listings and applications on this site, and say so.
- Anonymous applying hides structured fields; free text (a cover note, role descriptions) can still identify someone, and
  one global admin role means no per-company reviewer scoping.
- Speech recognition uses the browser's own service and is untested in CI (no microphone in headless Edge).
- GitHub's anonymous rate limit (60 requests an hour per server address) can block portfolio scans on a busy deployment.
- Auto-apply runs when the candidate opens Auto-apply or My Applications (at most every 30 minutes), when the rule is saved, and from the scheduled endpoint `/api/cron/auto-apply` once it is deployed with `CRON_SECRET` set (`vercel.json` schedules it daily; Vercel Hobby allows one run a day).
- Not built: email delivery (alerts and status changes are in-app only), a hosted deployment, and error monitoring. Each needs an account or a new dependency.
- Verification state in the seed data is demo data; admins change it at /admin/companies.
- No moderation or reporting for interview notes; no email delivery (drafts are copied or opened in your mail app).
- In-memory rate limiting per server instance; a shared store would be the next step at scale.
- Lighthouse performance (mobile emulation, local production build, headless Edge, one run each): home 92, jobs list 86. LCP was 3.0 s and 3.5 s, total blocking time 200 ms and 280 ms, layout shift 0. A single local run is a spot check, not a benchmark.
