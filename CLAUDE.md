# HanFlow

Korean Language Sandbox Canvas — paste a Korean sentence, get an interactive visual
breakdown of grammar, particles, phonetics, conjugation, and vocabulary. B2C SaaS,
mobile-first.

## Engineering standards

This codebase is maintained as a **clean-code showcase** — it is presented to others as
an example of careful, idiomatic, best-practice engineering. Hold every change to that
bar; readability and intent are first-class deliverables, not afterthoughts. Concretely,
each change must:

- **Pass the gate** — `pnpm check` reports `0 ERRORS 0 WARNINGS` before work is "done".
- **Follow the codebase, not generic defaults** — match the conventions and the
  surrounding file's style exactly (see [Conventions](#conventions) below). Consistency
  reads as intentional; one-off deviations read as sloppy.
- **Name for intent** — names reveal what/why; no dead code, no commented-out blocks, no
  leftover scaffolding. Comments explain *why*, never restate *what* the code does.
- **Stay small and well-bounded** — focused modules with one clear purpose; if a file
  grows to do too much, that's a signal to split it.
- **Be robust** — handle edge cases and fail soft (e.g. cache/IO outages degrade, never
  500); validate at trust boundaries with the Zod schemas.
- **Be type-safe and accessible** — no `any`/unchecked casts; preserve the existing
  a11y patterns (`aria-label`, `role`, semantic markup).

These are the lens for all work going forward — when in doubt, choose the option a
reviewer would call clean.

## Stack

| Layer | Choice |
|---|---|
| Framework | SvelteKit 2 + Svelte 5 (**runes only** — no legacy `$:`/stores) |
| Canvas | `@xyflow/svelte` v1 |
| Themes | Dark Immersive (default) + Light Academic via `[data-theme]` CSS custom properties |
| LLM | Vercel AI SDK — Anthropic primary, Gemini fallback |
| Cache | Redis (`ioredis`) — SHA-256 sentence hash → parsed JSON, 7-day TTL |
| Auth | Auth.js v5 (`@auth/sveltekit`) — GitHub + Google OAuth, JWT sessions |
| Database | PostgreSQL + Drizzle ORM |
| Deployment | Railway (`adapter-node`) |
| Validation | Zod — `src/lib/schemas/sentence.ts` is the single source of truth for parsed-sentence shape |

## Commands

```bash
pnpm dev              # dev server
pnpm check            # svelte-kit sync + svelte-check — THE verification gate (no test runner exists)
pnpm lint             # prettier --check + eslint (don't auto-fix repo-wide, see Conventions)
pnpm db:generate      # drizzle-kit generate — run after editing schema.ts
pnpm db:migrate       # apply migrations (drizzle.config.ts → drizzle/migrations)
pnpm db:studio        # Drizzle Studio against DATABASE_URL
docker compose up -d  # local Postgres 16 + Redis 7
```

Env vars: see `.env.example`. Required for full functionality: `DATABASE_URL`, `REDIS_URL`,
`AUTH_SECRET`, `GITHUB_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `ANTHROPIC_API_KEY`,
`GOOGLE_GENERATIVE_AI_API_KEY`.

## Conventions

### Svelte 5 runes only
`$state`, `$derived`, `$derived.by`, `$effect`, `$props()`, `$props.id()`. Runes-based
singleton stores (`stores/theme.svelte.ts`, `utils/speech.svelte.ts`,
`components/canvas/canvas.state.svelte.ts`) follow a factory-function pattern: a
`create*()` function holds `$state` locals and returns an object of getters + action
functions; the module exports one singleton instance (except `canvas.state.svelte.ts`,
which is instantiated per-canvas and shared via Svelte context — see
`components/canvas/CLAUDE.md`).

### Indentation — inconsistent, match the file you're editing
`.prettierrc` declares `useTabs: true`, but the codebase is a real mix of tabs and
2-space depending on when/how a file was written (e.g. `src/routes/+page.svelte` is
2-space, `src/routes/history/+page.svelte` is tabs). **Don't run `pnpm format` or
`eslint --fix` across the whole repo** — it will retab a large number of files and
produce a huge diff unrelated to your change. When editing a file, match its existing
indentation.

### CSS
- Always use existing custom properties from `src/app.css` (colors, `--radius-node`,
  `--navbar-height`, `--sidebar-width-desktop`, `--bottom-sheet-height`, etc.). Never
  hardcode hex colors — every color needs a dark *and* light value.
- Per-item icon-action buttons (e.g. `SpeakButton`) sit in a wrapper div named
  `*-actions` (`.node-actions`, `.sentence-actions`, `.example-actions`) — established
  convention for the voice-pronunciation feature, follow it for similar additions.

### Verification gate
No test runner (`package.json` has no `test` script). `pnpm check` must report
`0 ERRORS 0 WARNINGS` before considering a change done.

### Development workflow
Non-trivial features are built in an isolated git worktree (`.worktrees/<branch>`)
using subagent-driven development (implementer → spec review → code-quality review per
task, final review, then merge). This is the established pattern for new phases/features.

## Architecture map

```
src/
├── app.html                  # FOUC-prevention inline theme script (reads localStorage before paint)
├── app.css                   # ALL theme tokens (dark/light) — check here before adding any color/spacing
├── app.d.ts                  # App.Locals / Session type augmentation
├── auth.ts                   # Auth.js v5 config — see "Auth" below
├── hooks.server.ts           # sequence(authHandle)
├── lib/
│   ├── schemas/sentence.ts          # ParsedSentenceSchema (Zod) — shared client+server contract
│   ├── server/
│   │   ├── db/                      # → src/lib/server/db/CLAUDE.md (schema + Redis cache)
│   │   ├── llm/                     # → src/lib/server/llm/CLAUDE.md (parse pipeline)
│   │   ├── redis.ts                 # ioredis singleton (globalThis.__redis, lazyConnect)
│   │   └── korean.ts                # isHangulOnly() — Hangul-only input gate
│   ├── components/
│   │   ├── canvas/                  # → src/lib/components/canvas/CLAUDE.md
│   │   ├── sidebar/                 # → src/lib/components/sidebar/CLAUDE.md
│   │   ├── sandbox/InputSandbox.svelte   # home page form (Hangul validation, loading state via `enhance`)
│   │   ├── history/HistoryCard.svelte
│   │   └── ui/                      # NavBar, ThemeToggle, LoadingOverlay, SpeakButton,
│   │                                #   DisplayOptions, ReportModal, ShareButton, FavoriteButton
│   ├── stores/theme.svelte.ts       # dark/light theme, persisted to localStorage
│   └── utils/
│       ├── hash.ts                  # SHA-256, NFC-normalized — basis of the Redis cache key
│       ├── speech.svelte.ts         # Web Speech API (ko-KR TTS) singleton + adjustable rate
│       ├── display.svelte.ts        # learner display prefs (gloss/romanization), persisted
│       ├── parsing.svelte.ts        # "analysis in progress" flag for the LoadingOverlay
│       └── recents.svelte.ts        # last 3 analysed sentences (localStorage)
└── routes/
    ├── +page.svelte / +page.server.ts        # home — sentence input, parse pipeline (form action)
    ├── canvas/+page.svelte / +page.server.ts # topology canvas + sidebar
    ├── history/                      # paginated sentence history + favorites (auth-gated)
    ├── login/, auth/[...nextauth]/   # Auth.js
    ├── api/favorite/+server.ts       # PATCH toggle is_favorited
    └── api/feedback/+server.ts       # POST report-incorrect-parse → parse_feedback
```

## Parse pipeline (core data flow)

```
POST / (form action, routes/+page.server.ts)
  isHangulOnly(sentence) — reject non-Korean (422)
  hash = sha256(sentence.trim().normalize('NFC'))
  redis.get(`hanflow:parsed:${hash}`)
    HIT  → skip LLM
    MISS → parseSentence() [Anthropic → Gemini fallback] → redis.setex(hash, 7-day TTL, json)
  if logged in → fire-and-forget insert into sentence_history
  cookies.set('hf_key', hash)  — only the hash, never the full JSON (4KB cookie limit)
  redirect → /canvas

GET /canvas (routes/canvas/+page.server.ts)
  hash = url.searchParams.get('hash') ?? cookies.get('hf_key')
  redis.get(`hanflow:parsed:${hash}`) → HIT: done
  MISS → query sentence_history by hash, re-seed Redis, or redirect to / if not found
```

## Auth

- **JWT sessions** (`session: { strategy: 'jwt' }`) — required as-is. With
  `DrizzleAdapter`, switching to database sessions changes the `callbacks.session`
  signature (`token` becomes `undefined`), silently breaking `session.user.id`. Don't
  change the strategy without updating that callback.
- GitHub + Google OAuth providers work. **Credentials (email/password) is a stub** —
  `verifyPassword()` in `src/auth.ts` always throws (`TODO`). Implement with bcrypt
  before enabling email/password login.
- Protected routes: `src/routes/history/+layout.server.ts` guards via `locals.auth()`.

## Reference

Original design spec (2026-06-06): `docs/superpowers/specs/2026-06-06-hanflow-design.md`.
All 7 planned phases plus a voice-pronunciation feature are implemented and merged —
treat the spec as historical context; this file and the per-folder `CLAUDE.md` files
reflect the current implementation where they differ.
