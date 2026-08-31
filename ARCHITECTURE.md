# VITPulse — Architecture

A student-facing campus platform for VIT-AP: campus news, events, clubs,
previous-year question papers, opportunities, resources, community features and
an administrative console.

This document describes how the system is put together and why. It is meant to
be read before changing anything structural.

---

## 1. System architecture

```
                          ┌─────────────────────────────┐
  Browser ───────────────►│  Next.js 15 (App Router)    │
                          │  React 19 · TypeScript      │
                          └──────────────┬──────────────┘
                                         │
             ┌───────────────────────────┼───────────────────────────┐
             │                           │                           │
      Server Components           Server Actions                Route Handlers
      (read path)                 (write path)                  (/api/*)
             │                           │                           │
             └───────────────────────────┼───────────────────────────┘
                                         │
                            ┌────────────▼────────────┐
                            │   Domain repositories   │  src/server/db/repositories
                            │   (posts, events, …)    │
                            └────────────┬────────────┘
                                         │
                            ┌────────────▼────────────┐
                            │      Store port         │  src/server/db/store.ts
                            └───────┬────────┬────────┘
                                    │        │
                     ┌──────────────▼──┐  ┌──▼───────────────┐
                     │ SupabaseStore   │  │  MemoryStore     │
                     │ Postgres + RLS  │  │  seeded, local   │
                     └─────────────────┘  └──────────────────┘
```

### Layer responsibilities

| Layer | Location | Responsibility |
|---|---|---|
| UI | `src/components`, `src/app/**/page.tsx` | Rendering only. No data access, no authorisation logic. |
| Domain types | `src/types/domain.ts` | The shared contract. Mirrors the SQL schema 1:1. |
| Validation | `src/server/validation/schemas.ts` | Every write is parsed here. Sanitisation happens inside the schema. |
| Authorisation | `src/server/auth/` | Pure RBAC (`rbac.ts`) plus session resolution and guards (`session.ts`). |
| Actions | `src/server/actions/` | Write path. Validate → authorise → mutate → audit → revalidate. |
| Repositories | `src/server/db/repositories/` | Read path and domain queries. Written once, against the port. |
| Store port | `src/server/db/store.ts` | A small query language (filters, order, limit). No SQL leaks upward. |
| Adapters | `supabase-store.ts`, `memory-store.ts` | Two implementations of the port. |
| Integrations | `src/server/integrations/` | External systems, behind an interface. |

### Why a store port

The port exists so the product is runnable and testable with no infrastructure.
`MemoryStore` is seeded with a realistic dataset, so every route, mutation,
moderation workflow and analytics counter genuinely works on a fresh clone.
`SupabaseStore` translates the same query objects to PostgREST.

The port speaks **camelCase**; the Supabase adapter converts to and from the
snake_case columns, so no repository knows which backend it is talking to.

`getStore()` picks the adapter. In production without Supabase configured it
logs an error rather than silently serving demo data.

---

## 2. Database architecture

Postgres, via Supabase. Migrations in `supabase/migrations`, applied in order:

| File | Contents |
|---|---|
| `0001_schema.sql` | Enums, tables, constraints, indexes, `updated_at` triggers |
| `0002_functions.sql` | `auth_role()`, `has_role()`, `administers_club()`, `bump_counter()`, profile provisioning |
| `0003_rls.sql` | Row Level Security policies on every table |
| `0004_storage.sql` | Buckets and storage policies |

### Conventions

- UUID primary keys (`gen_random_uuid()`).
- `created_at` / `updated_at` on every mutable table, maintained by a trigger.
- **Enums** for closed value sets, so an invalid category cannot be written at all.
- Foreign keys everywhere, with `ON DELETE` chosen per relationship:
  `cascade` for owned rows (a club's members), `set null` for optional
  references (a post's club), `restrict` for authorship.
- Check constraints for invariants the application also enforces —
  `events_time_order`, `events_fee_matches_paid`, non-negative counters.

### Indexing

Indexes follow the queries the repositories actually issue, not a guess:

- `posts_feed_idx (status, pinned desc, published_at desc)` — the feed's hot path.
- `events_window_idx (status, starts_at)` and `events_ends_idx (status, ends_at)`
  — the upcoming/past/today windows filter on both bounds.
- `ads_serving_idx (placement, status, priority desc)` — ad selection.
- `pyq_papers_lookup_idx (status, branch, semester)` — the PYQ drill-down.
- GIN indexes on `tags` / `branches` array columns and `pg_trgm` on the text
  columns used for `ilike` search.
- Partial indexes (`where status = 'PUBLISHED'`) where the filter is always present.

### Counters

View, download, follower and impression counts are denormalised. They are
incremented through `bump_counter()`, a single SQL statement, never a
read-modify-write — concurrent requests would otherwise lose updates. The
function validates `(table, column)` against a hard allowlist, so its dynamic
SQL can only target a known counter. `MemoryStore.increment` clamps at zero to
match, and a test asserts the two adapters agree.

---

## 3. Authentication flow

```
  ┌──────────┐   email    ┌────────────────┐   magic link   ┌───────────────┐
  │  /login  │───────────►│ Supabase Auth  │───────────────►│ /auth/callback│
  └──────────┘            └────────────────┘                └───────┬───────┘
                                                                    │ exchange code
                                                            ┌───────▼────────┐
                                                            │ profiles row   │
                                                            │ (trigger or    │
                                                            │  ensureProfile)│
                                                            └───────┬────────┘
                                                                    ▼
                                                              session cookie
```

- Sign-in is a one-time link. No passwords are stored or handled.
- Only addresses on `ALLOWED_EMAIL_DOMAINS` may create an account.
- A Postgres trigger (`handle_new_user`) creates the profile row; the
  application's `ensureProfile()` is a belt-and-braces fallback.
- `SUPER_ADMIN_EMAILS` promotes the first administrator without a manual
  database edit.
- `src/middleware.ts` refreshes the access token on every request. Server
  Components cannot write cookies, so this must happen in middleware or the
  session silently expires mid-visit.
- `?next=` is passed through `safeInternalPath()`, which blocks the
  protocol-relative and absolute-URL open-redirect vectors.

**Without Supabase**, a signed (HMAC) demo cookie names one of the seeded
accounts, so every role is explorable locally. `signInAsDemoUser` refuses to run
once Supabase is configured, so it cannot become a production backdoor.

---

## 4. Authorization model

Seven roles: `STUDENT → CLUB_MEMBER → CLUB_ADMIN / EDITOR / MODERATOR → ADMIN → SUPER_ADMIN`.

Roles are **not** ranked by number. Each role's effective permission set is built
by unioning explicit grants from the roles it inherits (`src/server/auth/rbac.ts`),
which keeps the model auditable and lets EDITOR and MODERATOR be genuinely
different rather than merely "more" or "less".

### Three layers of enforcement

1. **UI** — `can()` hides controls a role cannot use. A courtesy, not security.
2. **Server** — every action calls `requirePermission()` / `requireClubPermission()`,
   which **throw** rather than return a boolean, so a forgotten `if` cannot open
   a hole. Pages use `requirePagePermission()`, which redirects instead.
3. **Database** — RLS policies re-check the same rules. A bug in layer 2 must not
   become a data breach.

### Rules worth calling out

- A **club admin** may create and edit content for clubs they administer, and may
  submit an ad — but `status: PUBLISHED` is downgraded to `PENDING_REVIEW` unless
  the actor holds `post:publish` / `event:publish`. That is what makes the review
  queue real rather than decorative.
- Only a **SUPER_ADMIN** can grant `ADMIN` or `SUPER_ADMIN` (`canAssignRole`),
  which blocks an admin from escalating a second account.
- Nobody can change or suspend **their own** role/account.
- A **suspended** account keeps its session but is downgraded to `STUDENT`
  permissions at the session layer and by `auth_role()` in SQL.
- **Bookmarks, notifications and preferences** are `user_id = auth.uid()` only,
  in both the application and RLS.

---

## 5. API strategy

Most data flows through Server Components (read) and Server Actions (write).
Route handlers exist only where a real HTTP endpoint is required:

| Route | Why it is an endpoint |
|---|---|
| `GET /api/search` | Called from the command palette on each keystroke (debounced). |
| `POST /api/analytics` | Must work with `navigator.sendBeacon` during page unload. |
| `GET /api/ads/[id]/click` | A redirect: the destination is re-validated at click time and the referrer stripped. |
| `POST /api/ads/[id]/impression` | Fired by an IntersectionObserver once the creative is genuinely visible. |
| `GET /auth/callback` | The OAuth/magic-link code exchange. |

Every server action returns a discriminated `ActionResult`, so callers handle
failure explicitly. `action()` in `_shared.ts` converts thrown errors into typed
results and — importantly — logs internal errors in full while returning a
generic message, so a database error string never reaches the browser.

---

## 6. Storage architecture

| Bucket | Visibility | Contents |
|---|---|---|
| `pyq-papers` | **Private** | Question paper PDFs, served via 30-minute signed URLs |
| `media` | Public | Club logos, event posters, cover images |

PYQ papers are private deliberately: a public, guessable path makes the whole
library scrapeable. Stored references use a `supabase://bucket/path` form and
`resolveFileUrl()` mints a signed URL at read time.

Upload validation, in order: MIME allowlist → declared size → **magic bytes**
(`%PDF-` for papers, signature check for images). Trusting the declared
content-type alone would let a renamed file through.

Locally, uploads write to `public/uploads/` so the same flow works end to end
with no credentials.

---

## 7. Environment variables

See `.env.example` for the annotated list. The security-relevant ones:

| Variable | Exposure | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `..._ANON_KEY` | Browser | Public by design; RLS protects the data. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Bypasses RLS. Read only inside `server-only` modules. Never prefix with `NEXT_PUBLIC_`. |
| `SESSION_SECRET` | Server only | HMAC for the demo cookie. |
| `ANALYTICS_SALT` | Server only | Rotating it resets unique counts and makes old hashes unlinkable. |
| `SUPER_ADMIN_EMAILS` | Server only | Bootstraps the first administrator. |

`src/lib/env.ts` parses these once with Zod and degrades to safe defaults rather
than throwing at import time, because Next evaluates modules during `next build`
where secrets may legitimately be absent.

---

## 8. Folder structure

```
src/
  app/                     Routes (App Router)
    api/                   Route handlers
    admin/                 Admin console (gated by layout + per-page permission)
    (public routes)/       news, events, clubs, pyqs, opportunities, resources, …
  components/
    shell/                 Desktop shell: window, rails, wallpaper, chrome
    layout/                Top bar, bottom nav, command palette, theme, footer
    ui/                    Design-system primitives (button, card, field, table…)
    content/               Domain cards: post, event, club, opportunity, ad
    events/ pyq/ community/ campus/ admin/   Feature-specific components
  lib/                     Pure utilities: cn, format, ranking, fuzzy, sanitize, env
  server/
    auth/                  RBAC and session
    actions/               Server actions (the write path)
    db/                    Store port, adapters, repositories
    integrations/          PYQ Hub connector
    storage/               Upload handling
    supabase/              Client factories
    validation/            Zod schemas
  seed/                    Demo dataset (clearly marked, never presented as real)
  types/                   Domain model
supabase/migrations/       SQL: schema, functions, RLS, storage
e2e/                       Playwright specs
refrence/                  Captured design reference (excluded from build/lint)
```

---

## 9. Ranking

`src/lib/ranking.ts` is deterministic and explainable. Every contribution is a
named, bounded term; `explainPostScore()` returns the full breakdown.

Signals: freshness (half-life decay), importance, popularity (log-scaled so one
viral item cannot dominate), followed clubs, interest-tag overlap, deadline
proximity, branch/year eligibility, and capacity.

No model, no randomness, no hidden weights. The shape is the seam an AI
re-ranker would slot into later — it would consume these signals rather than
replace them.

---

## 10. Deployment

| Environment | Frontend | Database | Notes |
|---|---|---|---|
| Development | `npm run dev` | MemoryStore (seeded) | No credentials needed. |
| Staging | Vercel preview | Supabase staging project | Same migrations, separate data. |
| Production | Vercel | Supabase production | `SUPER_ADMIN_EMAILS` set once, then cleared. |

### Migration strategy

Migrations are forward-only and numbered. Apply with `supabase db push` (or
`npm run db:migrate`). Because RLS lives in `0003_rls.sql`, a policy change is a
new numbered migration — never an edit to an applied file.

Deploy order matters: **migrate first, then deploy the application.** The schema
is additive, so the previous build keeps working against the new schema during
the rollout.

### Security headers

Set in `next.config.ts`: CSP, `X-Content-Type-Options`, `X-Frame-Options: DENY`,
`Referrer-Policy`, `Permissions-Policy`, HSTS.

---

## 11. Design system

Tokens live in `src/app/globals.css` and are the single source for colour,
radius, elevation and type. Values are taken from the captured reference in
`refrence/` — three surface levels (primary/secondary/tertiary), warm-neutral
lines, a categorical accent palette, radii of 4/6/9/12, and a measured type
scale exposed as `.t-hero`, `.t-h2`, `.t-body`, `.t-nav` and friends.

Colours are stored as RGB triples so they compose with Tailwind's opacity
syntax. **Components must never hard-code a hex value.**

Dark mode is a designed palette, not an inversion. Theme switching runs a
circular View Transition from the toggle plus a tree-wide colour crossfade, and
is skipped entirely under `prefers-reduced-motion`.

### The shell

The application renders inside a desktop metaphor: a wallpaper, flanking
application rails, and a floating window with real close/maximize controls
(`src/components/shell/`). Below `lg` the metaphor collapses to a full-bleed
sheet with a bottom navigation bar.

---

## 12. Integration: PYQ Hub

The existing deployment at `pyqs-hub.vercel.app` was probed during
implementation. It exposes **no public REST API** (`/api/*` returns 404), serves
its data by querying Supabase directly from the browser, and its edge rules
reject non-browser user agents.

Rather than inventing an API that does not exist,
`src/server/integrations/pyq-hub.ts` defines the boundary and ships three
implementations selected by environment:

1. `supabase` — point VITPulse at the hub's own Supabase project with a
   read-only anon key. The intended path: the hub already exposes these rows to
   any browser, so a server-side read with the same key is strictly narrower.
2. `rest` — if the hub later publishes an API, set `PYQ_HUB_API_URL`.
3. `none` (default) — VITPulse serves only its own moderated catalogue.

Remote rows are validated against a schema before use, mapped into the local
`PyqPaper` shape and marked `sourceKind: 'EXTERNAL'`. A failure degrades to an
empty list: the hub being down must never take a VITPulse page with it.

---

## 13. Analytics and privacy

First-party only. No cookies, no cross-site identifiers, no third-party scripts.

Unique visitors are approximated with `sha256(salt + date + coarse request
fingerprint)`, truncated. The hash rotates daily and cannot be reversed to a
person. Raw IPs and user agents are never persisted. Admin traffic is excluded
so it does not distort student-facing numbers.
