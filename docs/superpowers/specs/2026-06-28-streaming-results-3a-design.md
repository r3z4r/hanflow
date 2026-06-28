# Streaming + Results Flow (Sub-spec 3a) — Design

**Date:** 2026-06-28
**Status:** Approved — implementation plan to follow
**Parent:** umbrella `docs/superpowers/specs/2026-06-27-multipurpose-analysis-design.md` (§3–§8)
**Builds on:** Foundation (sub-spec 1) + Analysis Engine (sub-spec 2) — both merged to `main`.

## 1. Scope

**Additive new flow.** Wire the engine into a real, streaming, multi-segment, mode-switchable experience without removing anything. After 3a: submitting from the home page creates a document and lands on a streaming `/d/<docId>` results page. All legacy code (`/canvas` route, `sentence_history`, `/history`, `api/favorite`, `api/feedback`) stays present and functional — its removal is **sub-spec 3b (cutover)**.

**In scope**
- Home submit → create `document` + ordered `segments` → redirect to `/d/<docId>?mode=full`.
- `GET /api/analyze` SSE endpoint streaming per-segment, per-aspect results (with `&aspects=` for lazy mode upgrade).
- `/d/<docId>` results page: load doc+segments instantly, open one SSE stream, render stacked collapsible segment cards that fill aspect-by-aspect.
- Mode chips (default **Full**) with lazy upgrade (switching fetches only missing aspects).
- Per-(unitType × mode) rendering, reusing the existing `TopologyCanvas` for structure via an aspects→`ParsedSentence` adapter.
- `sentence.ts`: make `Token.romanization` **optional** (the new flow has no per-token romaja — see §6).

**Out of scope**
- Legacy removal / making the new flow the *only* path, reworking favorite/feedback → **sub-spec 3b**.
- History redesign (search/filter/date grouping, document/segment favoriting) → **sub-spec 4**.
- New canvas visualizations for `morphemes` / `grammarPatterns` (the data is computed + cached by sub-spec 2; rendering new node types is a later slice). 3a reuses the existing canvas node/edge set.
- Backfill of legacy `sentence_history` (disposable; never migrated).

## 2. Locked decisions

| Decision | Choice |
|---|---|
| This round | Sub-spec **3a only** (new flow, additive). Cutover = 3b. |
| Default mode | **Full** (`MODE_ASPECTS.full` = all four aspects). |
| Legacy during 3a | Untouched and functional. Home repoints to the new flow; `/canvas` etc. remain reachable. `sentence_history` is **not** written by the new flow (history shows pre-existing rows only until sub-spec 4 — "limping", per the umbrella). |
| Document dedupe | None — each submit inserts a fresh `document` + `segments`. Cross-document reuse still happens at the aspect cache layer (keyed by `segHash`). |
| Romaja granularity | Full-segment `fullRomanization` only; **no per-token romaja** in the canvas (consequence of sub-spec 2's `PronunciationAspect` shape). See §6. |

## 3. Request flow

```
Home (textarea + mode chips, default Full) ──submit──▶ POST / (action)
  normalizeInput(raw)
  if !containsHangul → return soft hint (re-render form), do not analyze
  segment(normalized) → units
  insert document { userId?, docHash, rawInput, normalizedInput, defaultMode }
  insert segments[] { documentId, segHash, segmentText, unitType, ordinal }
  redirect 303 → /d/<docId>?mode=full

GET /d/<docId>?mode=full
  load(): fetch document + ordered segments (text/unitType only) → instant render
  client: open EventSource GET /api/analyze?doc=<docId>&mode=full
    render a stacked, collapsible card per segment (skeletons), fill as events arrive
  mode chip change → EventSource GET /api/analyze?doc=<docId>&aspects=<missing csv>
```

## 4. SSE endpoint — `src/routes/api/analyze/+server.ts`

`GET /api/analyze?doc=<docId>&mode=<mode>` or `&aspects=<csv>` (lazy upgrade). Returns `text/event-stream` via a `ReadableStream`.

- Resolve the aspect set: `MODE_ASPECTS[mode]` when `mode` is given, else parse `aspects` csv (validated against `AspectSchema`).
- Load the doc's segments (ordered). For each `segment × aspect`, compute `getAspect(segment.segHash, aspect, () => parseAspect(aspect, segment.segmentText))`.
- Run with a small concurrency cap (e.g. 4 in flight); **emit each result as it resolves** (cache hits resolve immediately):
  ```
  event: aspect        data: { ordinal, segHash, aspect, result }
  event: aspect_error  data: { ordinal, aspect, message }   // one unit failed; others continue
  event: done          data: {}
  ```
- Fail-soft: a single aspect failure emits `aspect_error` and does not abort the stream. Closing the client `EventSource` ends it.
- Cache is the replay buffer (sub-spec 2): a reconnect re-streams cache hits instantly + remaining misses; the endpoint is idempotent.

A tiny pure helper formats an SSE frame (`event:`/`data:` lines) — unit-tested.

## 5. Results page — `src/routes/d/[docId]/`

- `+page.server.ts` `load`: fetch `document` by id + its `segments` ordered by `ordinal`; 404/redirect home if missing. Return `{ document, segments }` (no aspect data — that streams).
- `+page.svelte`: read `mode` from the URL (default Full); render header (input echo, mode chips, full-sentence `SpeakButton`) + a stacked list of **segment cards**. Open one `EventSource` for the doc; route incoming `aspect` events to the matching card+aspect via a small client store keyed by `ordinal`.
- **Segment card** (`SegmentCard.svelte`): shows the segment text, a `unitType` badge, a per-segment `SpeakButton`, and renders by mode:
  - `translation` → the translation line (compact; for `word` unitType this is the primary content).
  - `structure` → `TopologyCanvas` via the adapter (§6), collapsed by default (expand on tap) so paragraphs stay manageable.
  - `pronunciation` → `fullRomanization` + phonetic notes (rendered from the aspect's `surface`-based notes, not via the canvas sidebar) + TTS.
  - `glossary` → glossary entry list.
- Mode chips switch the visible mode and, if the new mode needs aspects not yet received, open an `&aspects=<missing>` stream (lazy upgrade). Aspects already in the client store render instantly.

## 6. aspects → canvas adapter — `src/lib/server/.../adapter` or `src/lib/utils/`

Composes the `structure` aspect (+ `translation`, + `pronunciation` where present) into the legacy `ParsedSentence` shape `TopologyCanvas` consumes.

- **`Token.romanization` becomes optional** in `sentence.ts` (`z.string().optional()`); the canvas node + sidebar render romaja conditionally. The new flow leaves it undefined (no per-token romaja exists — pronunciation provides only `fullRomanization`).
- Map `StructureToken` → `Token` (`id`, `value`, `type`, `gloss`, `position`, `conjugation?`; `romanization` omitted). `particleBridges`, `grammarNote` map straight across. `originalText` = segment text; `translation` from the translation aspect when present.
- **Glossary is re-keyed by headword/surface, not `tokenId`** (sub-spec 2 finding: token ids are not comparable across independent aspect LLM calls). The adapter attaches each glossary entry to a token by matching `headword`/surface against token `value`; entries that don't match still render in the glossary list, just without a node link.
- **Phonetic notes are NOT pushed through the canvas sidebar** (its phonetic tab is `tokenId`-based; the aspect's notes are `surface`-based). The pronounce view renders pronunciation directly. The adapter sets `phoneticNotes: []` on the composed `ParsedSentence` (the canvas's phonetic tab is empty in the new flow; phonetics live in the pronounce view).
- `morphemes` / `grammarPatterns` are carried in the data but **not rendered** by the existing canvas in 3a (visualization deferred).

The adapter is a pure function — unit-tested with sample aspect inputs.

## 7. Files

| File | Responsibility |
|---|---|
| `src/lib/schemas/sentence.ts` (modify) | `Token.romanization` → optional |
| `src/routes/+page.server.ts` (modify) | New action: sanitize → segment → insert document+segments → redirect `/d/<docId>` |
| `src/lib/components/sandbox/InputSandbox.svelte` (modify) | Relax client gate to `containsHangul`-equivalent; add mode chips (default Full) |
| `src/routes/api/analyze/+server.ts` (create) | SSE endpoint |
| `src/lib/server/sse.ts` (create) | Pure SSE-frame formatter |
| `src/routes/d/[docId]/+page.server.ts` (create) | Load document + segments |
| `src/routes/d/[docId]/+page.svelte` (create) | Results page: stream wiring + mode chips |
| `src/lib/components/results/SegmentCard.svelte` (create) | Per-segment, per-mode rendering |
| `src/lib/utils/canvas-adapter.ts` (create) | aspects → `ParsedSentence` (pure) |
| `*.test.ts` | Unit tests: SSE formatter, canvas adapter, aspect-set resolution, segment-creation helper |

## 8. Testing

- **Unit (Vitest):** SSE-frame formatter; the aspects→`ParsedSentence` adapter (token mapping, glossary re-keying, romaja-absent, phonetics emptied); aspect-set resolution from `mode`/`aspects`; any pure document/segment build helper.
- **Integration / manual:** the SSE route end-to-end and the `/d/<docId>` streaming UI (Svelte components + network + live LLM) are verified by running the app (use the `run`/`verify` flow), not automated — consistent with the repo's no-LLM-test norm.

## 9. Self-review checklist (for the plan author)

- Nothing legacy is removed (3a is additive); `/canvas`, `sentence_history`, `/history`, favorite/feedback all still compile and work.
- The new flow is reachable from home and lands on a streaming `/d/<docId>`.
- `Token.romanization` optional change does not break existing canvas rendering (conditional romaja).
- Adapter is pure + unit-tested; glossary re-keyed by headword; phonetics not forced through the tokenId sidebar.
- `pnpm check` 0/0; new `.ts`/`.svelte` files follow the conventions of the files they sit beside.
