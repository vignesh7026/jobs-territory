# Deploy to Vercel with hosted Supabase

The app needs a database Vercel can reach, so the local Docker one will not do. Total time: about 15 minutes.

## 1. Hosted Supabase (free tier is enough)

1. Create a project at https://supabase.com/dashboard. Choose a region near your users and save the database password.
2. In the project: **Project Settings > API**. Copy the **Project URL**, the **anon** key and the **service_role** key.
3. **Authentication > Providers > Email**: turn **off** "Confirm email" for a demo, otherwise new accounts cannot sign in
   until they click an emailed link and the free tier's built-in mailer is heavily rate limited. (Turn it back on once you
   configure your own SMTP.)
4. **Authentication > URL Configuration**: set **Site URL** to your Vercel URL once you have it.

## 2. Load the schema and demo data

From this folder:

```bash
npx supabase login                          # opens a browser
npx supabase link --project-ref <ref>       # the ref is in the dashboard URL
npx supabase db push                        # applies every migration in supabase/migrations
npm run seed:gen                            # regenerates supabase/seed.sql
npx supabase db push --include-seed         # loads the demo companies, jobs, contacts and the demo logins
```

Skip `--include-seed` for a real launch: the seed creates the public demo logins (`demo@...`, `admin@...`).
If you do load it, change both passwords straight away (Authentication > Users).

## 3. Vercel

```bash
npx vercel login                            # opens a browser
npx vercel link                             # creates the project
```

Set these environment variables (Project > Settings > Environment Variables, or `npx vercel env add NAME production`):

| Name                            | Value                                                      |
| ------------------------------- | ---------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Project URL from step 1                                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key                                                   |
| `SUPABASE_SERVICE_ROLE_KEY`     | service_role key (server only, never `NEXT_PUBLIC_`)       |
| `GROQ_API_KEY`                  | optional; your **new** key (rotate the one pasted in chat) |
| `CRON_SECRET`                   | any long random string; enables scheduled auto-apply       |

Then:

```bash
npx vercel deploy --prod
```

`vercel.json` already schedules `/api/cron/auto-apply` daily. Vercel sends `Authorization: Bearer $CRON_SECRET`
automatically. The Hobby plan allows one cron run per day.

## 4. Check it

- Open the URL, create an account, fill your profile, reload: you should stay signed in.
- Jobs list shows Verified / Not verified badges; `/auto-apply` loads.
- `curl -i https://<your-url>/api/cron/auto-apply` returns 401 (never open); with the secret it returns 200.
- Optionally run the browser checks against it: change `base` in `e2e/*.mjs` to your URL.
