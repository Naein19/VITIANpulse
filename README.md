# VITPulse

**Everything happening at VIT-AP, in one place.**

A student platform for VIT-AP University: campus news, events, clubs, previous
year question papers, opportunities, resources, lost & found, discussions and an
administrative console — built as a single fast, information-dense product.

---

## Quick start

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. That is the whole setup — **no database and no
credentials are required**. With Supabase unconfigured the app runs against a
seeded in-memory store, so every route, mutation, moderation workflow and
analytics counter genuinely works out of the box.

A banner marks the install as running on demo data, and every seeded item says
so in its body. Nothing in the sample dataset is a real university announcement.

### Exploring the roles

Sign-in offers one demo account per role, so the whole permission model is
explorable:

| Account | Role | What it can reach |
|---|---|---|
| Sneha Reddy | `STUDENT` | Follow, bookmark, register, upload a PYQ, post in discussions |
| Lakshmi Prasanna | `CLUB_ADMIN` | Submit club posts, events and ad campaigns for review |
| Meera Krishnan | `EDITOR` | Publish content, approve PYQ uploads |
| Imran Shaikh | `MODERATOR` | Moderation queue, ad review |
| Devraj Nandan | `ADMIN` | Verify clubs, suspend users, delete content |
| Aarthi Venkatesan | `SUPER_ADMIN` | Everything, including granting admin roles |

---

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit`, strict |
| `npm run lint` | ESLint |
| `npm run test` | Unit and integration tests (Vitest) |
| `npm run e2e` | End-to-end tests (Playwright) |
| `npm run verify` | Typecheck → lint → test → build, as CI runs it |
| `npm run db:migrate` | Apply Supabase migrations via the CLI |
| `npm run db:sql` | Regenerate the copy-paste bundle in `sql/` |

---

## Connecting Supabase

The app is fully functional without this. Connect it when you want real,
persistent, multi-user data.

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` — **server only**, never prefixed with
     `NEXT_PUBLIC_`
3. Create the schema. Either paste the SQL yourself, which needs no CLI:

   > Open the project's **SQL Editor** and run `sql/01_schema.sql` through
   > `sql/05_reference_data.sql` in order. See [sql/README.md](./sql/README.md)
   > — it covers what each file does, which are safe to re-run, and how to
   > check afterwards that RLS is actually on.

   or use the Supabase CLI:

   ```bash
   supabase link --project-ref <ref>
   supabase db push
   ```

   Either way you get the schema, the helper functions, every RLS policy, the
   two storage buckets, and the real VIT-AP reference data (campus locations,
   clubs, official links).
4. Set `SUPER_ADMIN_EMAILS` to your address, sign in once to be promoted, then
   clear the variable.
5. Restart. `getStore()` switches to Postgres automatically.

### Connecting the existing PYQ Hub

`pyqs-hub.vercel.app` exposes no public API — it queries Supabase directly from
the browser. The supported integration is therefore to point VITPulse at the
same Supabase project with a read-only anon key:

```bash
PYQ_HUB_SUPABASE_URL=...
PYQ_HUB_SUPABASE_ANON_KEY=...
PYQ_HUB_PAPERS_TABLE=papers
```

If the hub later publishes a REST endpoint, set `PYQ_HUB_API_URL` instead. Both
paths are implemented in `src/server/integrations/pyq-hub.ts`; without either,
VITPulse serves only its own moderated catalogue. See ARCHITECTURE.md §12.

---

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 ·
Supabase (Postgres, Auth, Storage, RLS) · Zod · TanStack Query · Lucide ·
Vitest · Playwright

---

## Project layout

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full picture. In brief:

```
src/app/          Routes
src/components/   Shell, layout, design system, feature components
src/data/         Verified real VIT-AP data (campus, calendars, clubs, links)
src/lib/          Pure utilities (ranking, formatting, sanitisation, env)
src/server/       Auth, actions, repositories, store adapters, integrations
src/seed/         Demo dataset (built on top of src/data/)
sql/              Generated copy-paste bundle for the Supabase SQL editor
supabase/         SQL migrations: schema, functions, RLS, storage
e2e/              Playwright specs
refrence/         Captured design reference (excluded from build and lint)
```

---

## Security posture

- **Authorization is server-side.** Hiding a button is a courtesy;
  `requirePermission()` throwing is the gate. RLS re-checks in the database.
- **Nothing renders user HTML.** `dangerouslySetInnerHTML` appears once, for
  JSON-LD we construct ourselves. All rich text is plain text through React's
  escaping.
- **Every write is validated by Zod**, with sanitisation inside the schema, so
  unsanitised values cannot be persisted.
- **URLs are protocol-checked** (`safeExternalUrl`), which is what stops an
  advertiser turning a CTA into script execution. Redirect targets go through
  `safeInternalPath` to block open redirects.
- **Uploads are checked by magic bytes**, not the declared content type.
- **Rate limits** on sign-in, posting, commenting, uploads, reports and search.
- **Audit log** on every privileged mutation.
- **Analytics are cookie-less**, using a daily-rotating non-reversible hash.

Run `npm run test` to exercise the authorisation matrix, the validation
boundary, the ranking maths and the store semantics directly.

---

## Accessibility

Semantic HTML, one `<h1>` per page, labelled form controls (`Field` owns the
association), visible focus rings, keyboard-navigable dialogs with focus trap
and restore, `aria-live` toasts, AA-contrast token pairs in both themes, and
full `prefers-reduced-motion` support including the theme transition.

---

## A note on the design reference

`refrence/` holds a captured copy of [posthog.com](https://posthog.com) used as
a design reference. VITPulse reproduces its **design system** — the token
values, type scale, spacing, radii, elevation, shell geometry and interaction
patterns — because that was the brief.

It deliberately does **not** ship PostHog's trademarked logo, their illustration
assets, their licensed *RoundHog* typeface or their marketing copy. VITPulse
uses its own wordmark, its own campus artwork, and Figtree (metrically matched)
with Source Code Pro.
