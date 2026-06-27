# Multi-Purpose Analysis Redesign — Umbrella Design

**Date:** 2026-06-27
**Status:** Approved (umbrella) — sub-specs to follow
**Scope:** Re-platform HanFlow's core from "one Korean sentence → one canvas" into a
multi-purpose analysis tool that accepts words, sentences, paragraphs, and long/mixed
text; produces mode-specific output (translate / breakdown / pronounce / full); streams
results per segment; and replaces the restrictive input gate with under-the-hood
sanitization.

This is an **umbrella architecture doc**. It defines the data model, the aspect/mode
contract, and the streaming contract that bind four sequenced sub-specs together. Each
sub-spec gets its own plan → implementation cycle.

---

## 1. Motivation

The current flow is `POST / → parseSentence() (one blocking generateObject) → 303
redirect → /canvas`. Consequences:

- **Blank blocking wait** — the user sees only a loading overlay until the entire parse
  completes; nothing partial is shown.
- **Single-sentence assumption** — input is one sentence; a paragraph has no first-class
  representation. Output is exactly one canvas.
- **Restrictive input** — `isHangulOnly` rejects mixed/minimal text; users can be blocked
  from getting any output.
- **One-size output** — a user who only wants a translation or pronunciation still pays
  for (and waits on) the full structural parse.

### Goals

1. Accept multi-purpose input: single word, sentence, paragraph, long/mixed text.
2. Let the user pick a **purpose/mode** (Translate · Breakdown · Pronounce · Full),
   adaptive output, switchable after submission **without re-submitting**.
3. **Stream** results per segment; cached segments appear instantly.
4. **Sanitize, don't restrict** — normalize messy/mixed input under the hood; the gate is
   "contains some Hangul", not "Hangul only".
5. Decompose inflected forms (e.g. `막혔을` → `막히다 + -었- + -을 때`) and named grammar
   patterns (e.g. `-더라`).
6. History: full-text search, favorite filter, and date-bucketed organization, with
   favoriting at both document and segment level.

### Non-goals (this round)

- Account/auth changes, billing, or new LLM providers.
- Real-time collaborative editing.
- Offline mode.
- A trigram/tsvector search index (ilike first; index is a noted future upgrade).

---

## 2. Locked decisions

| Decision | Choice |
|---|---|
| Analysis mode | User picks a mode; output adapts; switchable after via lazy aspect fetch |
| Data/persistence | New `documents` → `segments` tables + `segment_aspects` cache; favorite/search at both levels |
| Sanitization | Accept + normalize anything containing ≥1 Hangul char; soft-hint pure non-Korean |
| Spec structure | This umbrella doc + 4 sequenced sub-specs |

---

## 3. Core concept: Aspects

A segment is no longer parsed as one monolithic object. It is parsed into independent
**aspects**, each separately computed, cached, and streamed:

| Aspect | Contents | Relative cost |
|---|---|---|
| `translation` | natural English translation (`literalGloss?`) | cheap |
| `structure` | tokens, morpheme decomposition, particle bridges, grammar note, grammar patterns | medium |
| `pronunciation` | per-token + full romanization, phonetic notes (TTS is client-side) | medium |
| `glossary` | headwords, definitions, example sentences | expensive |

**Modes are aspect bundles:**

| Mode | Aspects |
|---|---|
| Translate | `translation` |
| Breakdown | `structure`, `translation` |
| Pronounce | `pronunciation`, `translation` |
| Full | `translation`, `structure`, `pronunciation`, `glossary` |

Switching mode after the fact fetches only the **missing** aspects (lazy upgrade); already
-cached aspects return instantly. This is what makes "switch without re-submit" cheap and
honest.

---

## 4. Request flow (replaces POST → parse → redirect)

```
Home: textarea + mode chips ──submit──▶ POST / (action)
  normalizeInput(raw)                 # trim, NFC, strip control/zero-width, collapse ws, fullwidth→half
  if !containsHangul → return friendly soft hint, do NOT run analysis (not a harsh 422)
  segment(normalized)                 # ordered units, each classified word|sentence|fragment
  upsert documents row (docHash = sha256(normalized))
  upsert ordered segments rows (segHash = sha256(segmentText) each)
  redirect 303 → /d/<docId>?mode=<mode>

/d/<docId>: load() returns { document, segments[] (text + unitType only) }  # instant
  client opens SSE: GET /api/analyze?doc=<docId>&mode=<mode>
    for each segment × each required aspect:
      hot cache hit   (redis hanflow:seg:<segHash>:<aspect>) → emit immediately
      cold cache hit  (segment_aspects DB)                   → re-seed redis, emit
      miss            → generateObject (Anthropic → Gemini)  → cache (redis + DB) → emit
  client renders stacked segment cards; each fills aspect-by-aspect
  mode switch → GET /api/analyze?doc=<docId>&aspects=<missing>  # only missing aspects
```

The `hf_key` cookie is retired; the document id in the URL (`/d/<docId>`) is the shareable
handle.

---

## 5. Data model

```
documents
  id uuid pk · userId text null (set null on user delete)
  docHash text not null · rawInput text not null · normalizedInput text not null
  defaultMode text not null · isFavorited bool default false · createdAt timestamptz
  index(userId) · index(docHash)

segments
  id uuid pk · documentId uuid fk (cascade) · segHash text not null
  segmentText text not null · unitType text not null  # word | sentence | fragment
  ordinal int not null · isFavorited bool default false
  index(documentId, ordinal) · index(segHash)

segment_aspects                # persistent (cold) parse cache, cross-document
  segHash text · aspect text · result jsonb not null · model text · createdAt timestamptz
  pk(segHash, aspect)

parse_feedback                 # retained, re-keyed
  …existing… · segHash text not null   # was sentenceHash
```

- **Two-level favorite:** `isFavorited` on both `documents` and `segments`.
- **Cross-document reuse:** `segment_aspects` is keyed by `(segHash, aspect)`, independent
  of any document — the same sentence in two paragraphs computes each aspect once, ever.
- **Cache tiers:** Redis (`hanflow:seg:<segHash>:<aspect>`, 7-day TTL) is the hot cache;
  `segment_aspects` is the durable cold cache. A Redis outage degrades to the DB, then the
  LLM — never a 500 (preserves current fail-soft posture).
- `sentence_history` is superseded by `documents` + `segments` (see §9 Migration).

---

## 6. Analysis engine

### 6.1 Sanitization & segmentation (deterministic, no LLM)

`src/lib/server/korean.ts` replaces `isHangulOnly` with:

- **`normalizeInput(raw): string`** — trim, NFC normalize, strip control + zero-width
  characters, collapse whitespace, full-width→half-width ASCII. Never throws.
- **`containsHangul(text): boolean`** — the new gate (≥1 Hangul syllable or jamo). Input
  with **at least some Hangul** is accepted and analyzed; **pure non-Korean** input is not
  analyzed and the input shows a friendly soft hint ("No Korean detected") rather than a
  harsh validation error. Mixed Korean + Latin + digits + emoji **passes**; non-Hangul
  tokens are typed `unknown`/foreign downstream; emoji are dropped from analysis.
- **`segment(text): Segment[]`** — splits into ordered units. Sentence boundaries on final
  punctuation (`. ? ! … 。`) and newlines, with Korean-aware handling (declaratives ending
  in `다` without punctuation). Each unit classified:
  - `word` — single eojeol (no internal spaces)
  - `sentence` — full clause
  - `fragment` — phrase (e.g. `물리적으로 막혔을 때`)
  - **Fail-soft:** if it cannot split confidently, the whole input becomes one `fragment`
    segment — never an error.
  - Capped at `MAX_SEGMENTS` (e.g. 50) with a visible "analyzed first N of M" notice —
    no silent truncation.

### 6.2 Per-aspect schemas & prompts

`ParsedSentenceSchema` splits into focused, independently-valid Zod schemas, each driven by
one `generateObject` call and one focused prompt:

- **`TranslationAspectSchema`** — `{ translation, literalGloss? }`
- **`StructureAspectSchema`** — `{ tokens[], particleBridges[], grammarNote, grammarPatterns[] }`
- **`PronunciationAspectSchema`** — `{ fullRomanization, tokenRomanization[], phoneticNotes[] }`
- **`GlossaryAspectSchema`** — `{ entries[] }`

Rationale: smaller schemas yield faster, cheaper, more reliable structured output, and each
aspect is a valid streamable unit (no partial-object guards needed). The existing
`ParsedSentence` becomes a **composed view** assembled from aspects by an adapter, so the
canvas components keep their current shape (keeps the output sub-spec small).

`prompt.ts` changes from one mega-prompt to per-aspect prompt builders, each carrying the
rules + few-shot relevant to its aspect (Revised Romanization for pronunciation, particle
mapping for structure, etc.).

### 6.3 Inflection / morphology decomposition

Lives in the `structure` aspect. Two additions, both **`.optional()`** so existing cached
entries still `safeParse` (per the established schema-evolution rule):

- **`Token.morphemes?: Morpheme[]`** — `{ surface, dictionaryForm?, role: stem|infix|ending|particle, meaning }`.
  Example: `막혔을` → `[ 막히-(stem, dict 막히다), -었-(past infix), -을(prospective ending) ]`.
- **`StructureAspect.grammarPatterns?: GrammarPattern[]`** — named multi-token
  constructions: `{ pattern, meaning, tokenIds[] }`. Examples: `-을 때` ("when…"), `-더라`
  ("retrospective"). Captures constructions that span tokens, which the verb-only
  `ConjugationChain` cannot. The existing `conjugation` field is retained for the
  verb-chain visualization.

### 6.4 Model routing & graceful failure

Each aspect calls Anthropic (Haiku, primary) → Gemini (fallback) **independently** (reusing
the existing `parseSentence` fallback pattern, generalized per-aspect). One aspect or one
segment failing degrades only that card region; the rest render. Both calls keep
`temperature: 0.1` (cache-stability requirement).

---

## 7. Streaming contract

`GET /api/analyze?doc=<docId>&mode=<mode>` (optional `&aspects=<csv>` for lazy upgrade).

```
event: aspect        data: { ordinal, segHash, aspect, result }   # each aspect completes
event: aspect_error  data: { ordinal, aspect, message }           # partial fail; card shows the rest
event: done          data: {}
```

- **Cache is the replay buffer.** Each aspect is cached (Redis + `segment_aspects`) the
  instant it completes. A dropped stream simply reconnects and re-streams cache hits
  instantly + remaining misses — no server-side replay buffer needed; the endpoint is
  idempotent.
- **Lazy mode upgrade:** switching mode requests only the missing aspects; cached ones
  return immediately.
- **Cancellation:** the client closes the `EventSource` (navigates away / edits input).

---

## 8. Output & history surfaces

### 8.1 Results — `/d/<docId>`

- **Header:** input echo, mode chips (`Translate · Breakdown · Pronounce · Full`),
  document-level favorite.
- **Stacked segment cards**, in order; skeleton → fills aspect-by-aspect as SSE arrives.
- **Per-(unitType × mode) rendering:**
  - Translate → compact line (a `word` unit renders a headword/gloss/POS card).
  - Breakdown / Full → the existing canvas, reused via an aspect→`ParsedSentence` adapter.
  - Pronounce → romanization + phonetic notes + 🔊 TTS (existing `speech.svelte.ts`).
- Per-segment canvases collapse by default (expand on tap) — keeps long text manageable on
  mobile.
- Segment-level favorite + speak button per the established `*-actions` wrapper convention.

### 8.2 History — `/history`

- **Search** over `segmentText` + `translation` (ilike; pg_trgm/tsvector noted as a future
  index upgrade). **Favorite filter** toggle (All | ★ Favorites). **Date buckets:** Today /
  Yesterday / Last 7 days / Last 30 days / Older.
- Items are **documents** (with segment count) that expand to their segments; favoriting and
  search work at both levels. Filters are URL query params (`?q=&fav=1&page=`) — server
  -rendered and shareable. Pagination retained.

---

## 9. Error handling & migration

### Fail-soft (preserves current posture)

- Redis miss/outage → fall to `segment_aspects` (DB) → LLM; never 500.
- Aspect failure → `aspect_error` event; that card region offers retry; rest render.
- Empty input → rejected. Hangul-free input → friendly soft hint; analysis not run (not a
  harsh validation error).

### Migration

- Drizzle migration adds `documents`, `segments`, `segment_aspects`; re-keys
  `parse_feedback` to `segHash`.
- Backfill: each `sentence_history` row → a 1-segment document; its `parsed_result` is split
  (best-effort) into `translation` / `structure` / `pronunciation` / `glossary` aspects.
- `sentence_history` kept read-only through the transition; dropped after backfill is
  verified.

---

## 10. Sub-spec sequencing

Each item below becomes its own spec → plan → implementation cycle.

1. **Foundation** — `documents` / `segments` / `segment_aspects` schema + migration,
   `normalizeInput` / `containsHangul` / `segment`, Redis key scheme. Old flow keeps working
   behind an adapter (no user-visible change yet).
2. **Analysis engine** — per-aspect Zod schemas + prompt builders, morphology +
   `grammarPatterns`, per-aspect model routing, aspect cache read/write.
3. **Streaming + results** — `/api/analyze` SSE endpoint, `/d/<docId>` route, incremental
   rendering, mode chips + lazy upgrade, aspect→canvas adapter, word/compact views.
4. **History** — search, favorite filter, date grouping, both-level favoriting.

---

## 11. Open questions (resolve in sub-specs, not blocking)

- Exact `MAX_SEGMENTS` value and the over-limit UX copy.
- Whether `grammarPatterns` needs a curated reference list of common patterns (`-을 때`,
  `-더라`, `-는데`, …) seeded into the prompt for consistency.
- History search: ship ilike first; decide pg_trgm vs tsvector when volume warrants.
- Whether `defaultMode` should be remembered per user (display prefs) or per document only.
