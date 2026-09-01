# SQL — copy-paste setup for Supabase

Everything here is **generated**. Run `npm run db:sql` to rebuild it after
changing `supabase/migrations/` or `src/data/vitap.ts`; do not edit these files
by hand, your changes will be overwritten.

## What to run

Open your Supabase project → **SQL Editor** → **New query**, then paste and run
each file **in order**. Wait for each to finish before starting the next.

| # | File | What it creates |
|---|------|-----------------|
| 1 | `01_schema.sql` | Enums, every table, indexes, `updated_at` triggers |
| 2 | `02_functions.sql` | Permission helpers, counter triggers, search |
| 3 | `03_rls.sql` | Row Level Security — **not optional**, the app assumes it |
| 4 | `04_storage.sql` | The `pyq-papers` (private) and `media` (public) buckets |
| 5 | `05_reference_data.sql` | Real VIT-AP campus locations, clubs and official links |

`00_all_in_one.sql` is all five concatenated, for when you already know it
works. Running them one at a time makes an error far easier to locate.

Steps 1–4 are **not** safe to re-run on a project that already has them: they
use plain `create table` / `create type`, so a second run fails on the first
object that already exists. Step 5 **is** safe to re-run — every statement
upserts on its natural key, so re-running it refreshes the reference data after
`npm run db:sql`.

To start over, run `drop schema public cascade; create schema public;` first.
That destroys all data in the project.

## Then set your keys

Copy `.env.example` to `.env.local` in the project root and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

Find all three in **Project Settings → API**.

- The **anon key** is public by design — it ships to the browser, and RLS is
  what protects your data. That is why step 3 is not optional.
- The **service role key** bypasses RLS entirely. It is read only on the server,
  never prefixed with `NEXT_PUBLIC_`, and must never be committed. If it leaks,
  rotate it in the dashboard immediately.

Also set, in the same file:

```bash
SUPER_ADMIN_EMAILS=your.name@vitap.ac.in   # promoted to SUPER_ADMIN on first sign-in
ALLOWED_EMAIL_DOMAINS=vitapstudent.ac.in,vitap.ac.in
SESSION_SECRET=$(openssl rand -base64 32)
ANALYTICS_SALT=$(openssl rand -base64 24)
```

`SUPER_ADMIN_EMAILS` is how the first administrator is created without editing
the database by hand. Sign in once with that address and the account is
promoted; every later role change happens in the admin console with an audit
trail.

Restart `npm run dev` after editing the file. With the Supabase variables set
the app switches from the in-memory demo store to Postgres automatically — no
code change and no flag.

## What is *not* in here

The demo content — posts, events, discussions, lost-and-found, advertisements —
is generated in-app by `src/seed/` and never written to your database. A fresh
Supabase project starts with the real reference data from step 5 and nothing
else, which is what you want in production.

## Verifying it worked

```sql
select count(*) from campus_locations;   -- 32
select count(*) from clubs;              -- 36
select count(*) from resources;          -- 23
select count(*) from pg_policies where schemaname = 'public';  -- > 60
```

If the last query returns 0, step 3 did not run and your tables are
unprotected. Do not point a deployed site at the project until it does.
