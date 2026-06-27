# Analysis Engine (Sub-spec 2) — Design

**Date:** 2026-06-28
**Status:** Approved — implementation plan to follow
**Parent:** `docs/superpowers/specs/2026-06-27-multipurpose-analysis-design.md` (umbrella §3, §6)
**Builds on:** Foundation (sub-spec 1) — `analysis.ts` contract, `segment`, `hashText`, `segmentAspectKey`, `documents`/`segments`/`segment_aspects` tables.

## 1. Scope

Build the per-aspect parse engine: per-aspect Zod schemas, per-aspect prompt builders, a per-aspect parse function with provider fallback, and the aspect read-through cache. **Nothing here is wired into a route** — the live parse→canvas flow is untouched, so the app behaves exactly as today.

**In scope**
- Per-aspect schemas (`translation`, `structure`, `pronunciation`, `glossary`).
- Per-aspect prompt builders.
- `parseAspect(aspect, text)` — schema + prompt selection, Anthropic→Gemini fallback per aspect.
- `getAspect(segHash, aspect, compute)` — Redis + `segment_aspects` read-through cache, fail-soft.
- Unit tests for the deterministic pieces.

**Out of scope (→ sub-spec 3)**
- `/api/analyze` SSE route and the `/d/<docId>` results page.
- The aspects → legacy `ParsedSentence` composition adapter for the canvas (and any change to `ParsedSentenceSchema`, e.g. making `romanization` optional).
- Removal of the legacy `sentence_history` table and the old single-sentence parse flow.

## 2. Locked decisions

| Decision | Choice |
|---|---|
| Romanization placement | Lives in the `pronunciation` aspect (full + phonetic notes). `structure` tokens carry **no** romanization. Breakdown shows hangul+gloss+grammar; Pronounce/Full show romaja. `MODE_ASPECTS` (Foundation) unchanged. |
| Aspect independence | Each aspect is self-contained and renderable alone. **No cross-aspect tokenId references.** Intra-aspect references (structure's bridges/patterns → structure's own tokens) are allowed. |
| Legacy data | No backfill. `sentence_history` and the old flow are disposable (local-only, unpublished) and will be **removed at cutover (sub-spec 3)**, not migrated. |
| Testing | Unit-test deterministic pieces (schemas, prompt builders, cache orchestration via injected fakes). Live `generateObject` LLM calls are integration-verified manually (non-deterministic; matches repo norm of no automated LLM tests). |

## 3. Per-aspect schemas — `src/lib/schemas/aspects.ts`

Reuse existing sub-schemas/enums from `src/lib/schemas/sentence.ts` where they fit (DRY): `TokenTypeSchema`, `ParticleBridgeSchema`, `GrammarNoteSchema`, `ConjugationChainSchema`, `GlossaryEntrySchema`. New shapes are added here. New optional fields follow the established rule (`.optional()` so cached entries stay forward-compatible).

```ts
// translation
TranslationAspectSchema = z.object({
  translation: z.string(),           // natural full-segment English
  literalGloss: z.string().optional() // word-order-preserving gloss
})

// structure  (NO romanization — that lives in pronunciation)
MorphemeRoleSchema = z.enum(['stem', 'infix', 'ending', 'particle', 'suffix'])
MorphemeSchema = z.object({
  surface: z.string(),
  dictionaryForm: z.string().optional(),
  role: MorphemeRoleSchema,
  meaning: z.string()
})
StructureTokenSchema = z.object({
  id: z.string(),                    // "tok_0", "tok_1", … sequential, matches position
  value: z.string(),
  type: TokenTypeSchema,             // reused
  gloss: z.string(),
  position: z.number().int().nonnegative(),
  morphemes: z.array(MorphemeSchema).optional(),
  conjugation: ConjugationChainSchema.optional() // reused (verb chain)
})
GrammarPatternSchema = z.object({
  pattern: z.string(),               // e.g. "-을 때", "-더라"
  meaning: z.string(),
  tokenIds: z.array(z.string())      // references THIS aspect's tokens only
})
StructureAspectSchema = z.object({
  tokens: z.array(StructureTokenSchema),
  particleBridges: z.array(ParticleBridgeSchema), // reused (refs structure tokenIds)
  grammarNote: GrammarNoteSchema,                 // reused
  grammarPatterns: z.array(GrammarPatternSchema)
})

// pronunciation  (self-contained — surface refs, not structure tokenIds)
AspectPhoneticNoteSchema = z.object({
  phenomenon: PhoneticPhenomenonSchema, // reuse the enum from sentence.ts
  description: z.string(),
  surface: z.string().optional()        // the affected Hangul substring (not a tokenId)
})
PronunciationAspectSchema = z.object({
  fullRomanization: z.string(),         // Revised Romanization of the whole segment
  phoneticNotes: z.array(AspectPhoneticNoteSchema)
})

// glossary
GlossaryAspectSchema = z.object({
  entries: z.array(GlossaryEntrySchema) // reused
})
```

A discriminated lookup ties an aspect name to its schema for the engine:

```ts
ASPECT_SCHEMAS: Record<Aspect, ZodTypeAny> = {
  translation: TranslationAspectSchema,
  structure: StructureAspectSchema,
  pronunciation: PronunciationAspectSchema,
  glossary: GlossaryAspectSchema
}
```

> Note: `PhoneticPhenomenonSchema` already exists in `sentence.ts` but is not currently exported — export it for reuse. `GlossaryEntrySchema` references `tokenId`; in the aspect world the glossary is keyed by headword and its `tokenId` is advisory (the glossary aspect renders standalone), so no cross-aspect dependency is introduced at render time.

## 4. Prompt builders — `src/lib/server/llm/prompts/`

Split the current single `buildSystemPrompt()` (`prompt.ts`) into one builder per aspect, each returning `{ system, prompt }` for a given segment text. Each builder carries only the rules relevant to its aspect plus a small focused few-shot:

- `translation.ts` — natural-translation rules + optional literal gloss.
- `structure.ts` — token id rules (`tok_N` sequential), particle-type mapping (은/는→topic, 이/가→subject, 을/를→object, 에→location/direction), morpheme decomposition rules, named grammar patterns (`-을 때`, `-더라`, `-는데`, …), grammar note.
- `pronunciation.ts` — **Revised Romanization** (state explicitly; LLMs default to McCune-Reischauer), phonetic phenomena rules.
- `glossary.ts` — headword/definition/POS rules, ≤3 example sentences.

A small dispatcher maps `aspect → builder`. The legacy `prompt.ts` stays until sub-spec 3 removes the old flow.

## 5. `parseAspect` — `src/lib/server/llm/parse.ts`

Add alongside the existing `parseSentence` (don't remove it — old flow still uses it):

```ts
parseAspect(aspect: Aspect, text: string): Promise<AspectResult>
```

- Looks up the aspect's schema (`ASPECT_SCHEMAS`) and prompt builder.
- Runs `generateObject({ model, schema, system, prompt, temperature: 0.1 })` on `primaryModel` (Anthropic Haiku); on any throw, falls back once to `fallbackModel` (Gemini) — same pattern as `parseSentence`, now per aspect.
- Returns the validated aspect object. The return type is the union of the four aspect types (caller narrows by `aspect`).

## 6. Aspect read-through cache — `src/lib/server/aspect-cache.ts`

```ts
getAspect(segHash: string, aspect: Aspect, compute: () => Promise<unknown>): Promise<unknown>
```

Read-through tiers (each tier fail-soft — a failure degrades to the next, never a 500):
1. **Redis hot** — `cacheGet(segmentAspectKey(segHash, aspect))`; on hit, `safeParse` with the aspect schema; valid → return.
2. **`segment_aspects` cold** — `SELECT result FROM segment_aspect WHERE seg_hash=? AND aspect=?`; valid → re-seed Redis, return.
3. **Miss** — `await compute()` (the caller passes `() => parseAspect(aspect, text)`); validate; write both Redis (`cacheSet`, 7-day TTL) and `segment_aspects` (upsert on `(seg_hash, aspect)` conflict, storing `result` + `model`); return.

Validation uses `ASPECT_SCHEMAS[aspect].safeParse`; a corrupt cached entry is treated as a miss (mirrors the existing `+page.server.ts` cache handling). The DB upsert uses Drizzle `onConflictDoUpdate` on the composite PK.

> `getAspect` orchestration is unit-tested by injecting fake `cacheGet`/`cacheSet`, a fake DB accessor, and a fake `compute` — verifying the tier order, the re-seed on cold hit, and the dual write on miss. The IO modules (`redis.ts`, `db`) themselves are not exercised in unit tests.

## 7. Files

| File | Responsibility |
|---|---|
| `src/lib/schemas/aspects.ts` (create) | Per-aspect Zod schemas + `ASPECT_SCHEMAS` map + inferred types |
| `src/lib/schemas/sentence.ts` (modify) | Export `PhoneticPhenomenonSchema` (currently unexported) for reuse |
| `src/lib/server/llm/prompts/translation.ts` `structure.ts` `pronunciation.ts` `glossary.ts` `index.ts` (create) | Per-aspect prompt builders + dispatcher |
| `src/lib/server/llm/parse.ts` (modify) | Add `parseAspect`; keep `parseSentence` |
| `src/lib/server/aspect-cache.ts` (create) | `getAspect` read-through cache |
| `*.test.ts` colocated | Unit tests for schemas, prompt builders, `getAspect` orchestration |

## 8. Self-review checklist (for the plan author)

- Every aspect schema renders standalone (no field references another aspect's ids).
- `structure` tokens carry no romanization; `pronunciation` carries `fullRomanization`.
- `parseSentence` and `prompt.ts` remain (old flow intact); nothing wired into routes.
- New optional fields use `.optional()`.
- `getAspect` is fail-soft at every tier and unit-tested via injected fakes.
