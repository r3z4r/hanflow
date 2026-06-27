# Analysis Engine (Sub-spec 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the per-aspect parse engine — per-aspect Zod schemas, per-aspect prompt builders, `parseAspect` with provider fallback, and the `getAspect` read-through cache — without wiring any of it into a route (the live parse→canvas flow stays exactly as today).

**Architecture:** Four self-contained aspects (`translation`, `structure`, `pronunciation`, `glossary`), each with its own schema and prompt. `parseAspect(aspect, text)` runs Anthropic→Gemini per aspect via a small `tryWithFallback` helper. Caching is a pure `resolveAspect` orchestrator (Redis → `segment_aspects` → compute) wrapped by an IO-bound `getAspect`. Deterministic pieces are unit-tested with Vitest; live LLM calls are integration-verified manually.

**Tech Stack:** SvelteKit 2 + Svelte 5, TypeScript, Zod 4, Vercel AI SDK (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/google`), Drizzle ORM (PostgreSQL), ioredis, Vitest.

## Global Constraints

- **Verification gate:** `pnpm check` reports `0 errors, 0 warnings` before any task is done, plus that task's Vitest run.
- **Indentation:** new server/schema `.ts` files use **tabs** (match existing files).
- **Engine only — not wired into routes:** do NOT modify `src/routes/**`, `src/lib/server/llm/index.ts`, or remove `parseSentence`/`prompt.ts`. The legacy flow must keep working.
- **Aspect independence:** no field in one aspect references another aspect's token ids. Intra-aspect references (structure's `particleBridges`/`grammarPatterns` → structure's own `tok_N`) are allowed.
- **Romanization** lives only in the `pronunciation` aspect; `structure` tokens carry **no** romanization.
- **Romanization standard:** Revised Romanization (state it explicitly in the pronunciation prompt — LLMs default to McCune-Reischauer).
- **New optional fields** use `.optional()`.
- **Reuse, don't re-declare:** import `TokenTypeSchema`, `ParticleBridgeSchema`, `GrammarNoteSchema`, `ConjugationChainSchema`, `GlossaryEntrySchema`, `PhoneticPhenomenonSchema` from `src/lib/schemas/sentence.ts` (all already exported).
- **Fail-soft cache:** every cache tier degrades on failure (Redis outage → DB → LLM), never throws to the caller.
- **Cache key:** `segmentAspectKey(segHash, aspect)` (Foundation); **TTL 7 days** (`60 * 60 * 24 * 7`).
- **Aspect names** come from `src/lib/schemas/analysis.ts` (`Aspect` = `translation | structure | pronunciation | glossary`).

## Worktree setup (do once, before Task 1)

This is a fresh worktree. Before the first test/check run:
- `pnpm install` (populates `node_modules`, incl. Vitest, from the lockfile).
- Ensure `.env` exists in the worktree root; if missing, copy it from the main repo root (`/home/admin1/workspaces/personal/hanflow/.env`). `.env` is gitignored — this is environment setup, never committed. `svelte-check` needs it to resolve `$env/static/private`.

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/schemas/aspects.ts` (create) | Per-aspect Zod schemas, `ASPECT_SCHEMAS` map, inferred types (`AspectResultMap`/`AspectResult`) |
| `src/lib/server/llm/prompts/translation.ts` `structure.ts` `pronunciation.ts` `glossary.ts` (create) | One prompt builder per aspect → `{ system, prompt }` |
| `src/lib/server/llm/prompts/index.ts` (create) | `buildAspectPrompt(aspect, text)` dispatcher |
| `src/lib/server/llm/fallback.ts` (create) | `tryWithFallback(primary, fallback)` |
| `src/lib/server/llm/parse.ts` (modify) | Add `parseAspect`; keep `parseSentence` untouched |
| `src/lib/server/aspect-resolver.ts` (create) | Pure `resolveAspect(io)` orchestrator + `AspectResolverIO` (no IO imports → unit-testable without `$env`) |
| `src/lib/server/aspect-cache.ts` (create) | `getAspect(segHash, aspect, compute)` — binds real Redis/DB to `resolveAspect` |
| `*.test.ts` colocated | Unit tests for schemas, prompt builders, `tryWithFallback`, `resolveAspect` |

---

### Task 1: Per-aspect schemas

**Files:**
- Create: `src/lib/schemas/aspects.ts`
- Test: `src/lib/schemas/aspects.test.ts`

**Interfaces:**
- Consumes: `zod`; `TokenTypeSchema`, `ParticleBridgeSchema`, `GrammarNoteSchema`, `ConjugationChainSchema`, `GlossaryEntrySchema`, `PhoneticPhenomenonSchema` from `./sentence`; `Aspect` from `./analysis`.
- Produces: `TranslationAspectSchema`/`TranslationAspect`, `MorphemeRoleSchema`, `MorphemeSchema`/`Morpheme`, `StructureTokenSchema`/`StructureToken`, `GrammarPatternSchema`/`GrammarPattern`, `StructureAspectSchema`/`StructureAspect`, `AspectPhoneticNoteSchema`/`AspectPhoneticNote`, `PronunciationAspectSchema`/`PronunciationAspect`, `GlossaryAspectSchema`/`GlossaryAspect`, `ASPECT_SCHEMAS`, `AspectResultMap`, `AspectResult`.

- [ ] **Step 1: Complete worktree setup** (see "Worktree setup" above): `pnpm install`, ensure `.env` present.

- [ ] **Step 2: Write the failing test**

Create `src/lib/schemas/aspects.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import {
	TranslationAspectSchema,
	StructureAspectSchema,
	PronunciationAspectSchema,
	GlossaryAspectSchema,
	ASPECT_SCHEMAS
} from './aspects';

describe('TranslationAspectSchema', () => {
	it('accepts translation with optional literalGloss', () => {
		expect(TranslationAspectSchema.parse({ translation: 'I go to school.' }).translation).toBe(
			'I go to school.'
		);
		expect(
			TranslationAspectSchema.parse({ translation: 'x', literalGloss: 'y' }).literalGloss
		).toBe('y');
	});
	it('rejects a missing translation', () => {
		expect(TranslationAspectSchema.safeParse({}).success).toBe(false);
	});
});

describe('StructureAspectSchema', () => {
	const valid = {
		tokens: [
			{
				id: 'tok_0',
				value: '막혔을',
				type: 'verb',
				gloss: 'was blocked',
				position: 0,
				morphemes: [
					{ surface: '막히', dictionaryForm: '막히다', role: 'stem', meaning: 'to be blocked' },
					{ surface: '었', role: 'infix', meaning: 'past tense' },
					{ surface: '을', role: 'ending', meaning: 'prospective' }
				]
			}
		],
		particleBridges: [],
		grammarNote: { structure: 'other', explanation: 'fragment', formalityLevel: 'polite' },
		grammarPatterns: [{ pattern: '-을 때', meaning: 'when …', tokenIds: ['tok_0'] }]
	};
	it('accepts tokens with morphemes and grammar patterns', () => {
		const parsed = StructureAspectSchema.parse(valid);
		expect(parsed.tokens[0].morphemes?.[0].dictionaryForm).toBe('막히다');
		expect(parsed.grammarPatterns[0].pattern).toBe('-을 때');
	});
	it('rejects an invalid morpheme role', () => {
		const bad = structuredClone(valid);
		bad.tokens[0].morphemes![1].role = 'nonsense';
		expect(StructureAspectSchema.safeParse(bad).success).toBe(false);
	});
	it('rejects romanization on a structure token (it belongs to pronunciation)', () => {
		const withRoma = structuredClone(valid) as Record<string, unknown>;
		(withRoma.tokens as Array<Record<string, unknown>>)[0].romanization = 'makhyeoseul';
		// strict parse: structure tokens have no romanization field, so it is stripped, not an error.
		const parsed = StructureAspectSchema.parse(withRoma);
		expect('romanization' in parsed.tokens[0]).toBe(false);
	});
});

describe('PronunciationAspectSchema', () => {
	it('accepts fullRomanization and phonetic notes with surface', () => {
		const parsed = PronunciationAspectSchema.parse({
			fullRomanization: 'meogeoyo',
			phoneticNotes: [{ phenomenon: 'liaison', description: '받침 ㄱ links', surface: '먹어' }]
		});
		expect(parsed.fullRomanization).toBe('meogeoyo');
		expect(parsed.phoneticNotes[0].phenomenon).toBe('liaison');
	});
	it('rejects an unknown phenomenon', () => {
		expect(
			PronunciationAspectSchema.safeParse({
				fullRomanization: 'x',
				phoneticNotes: [{ phenomenon: 'made_up', description: 'd' }]
			}).success
		).toBe(false);
	});
});

describe('GlossaryAspectSchema', () => {
	it('accepts entries', () => {
		const parsed = GlossaryAspectSchema.parse({
			entries: [
				{
					tokenId: 'tok_0',
					headword: '학교',
					partOfSpeech: 'noun',
					definition: 'school',
					exampleSentences: [{ korean: '학교에 가요', english: 'I go to school' }]
				}
			]
		});
		expect(parsed.entries[0].headword).toBe('학교');
	});
});

describe('ASPECT_SCHEMAS', () => {
	it('has exactly the four aspect keys', () => {
		expect(Object.keys(ASPECT_SCHEMAS).sort()).toEqual([
			'glossary',
			'pronunciation',
			'structure',
			'translation'
		]);
	});
});
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `pnpm exec vitest run src/lib/schemas/aspects.test.ts`
Expected: FAIL — cannot resolve `./aspects`.

- [ ] **Step 4: Implement the schemas**

Create `src/lib/schemas/aspects.ts`:
```ts
import { z } from 'zod';
import {
	TokenTypeSchema,
	ParticleBridgeSchema,
	GrammarNoteSchema,
	ConjugationChainSchema,
	GlossaryEntrySchema,
	PhoneticPhenomenonSchema
} from './sentence';
import type { Aspect } from './analysis';

// ── translation ───────────────────────────────────────────────
export const TranslationAspectSchema = z.object({
	translation: z.string(),
	literalGloss: z.string().optional()
});
export type TranslationAspect = z.infer<typeof TranslationAspectSchema>;

// ── structure (no romanization — that lives in pronunciation) ──
export const MorphemeRoleSchema = z.enum(['stem', 'infix', 'ending', 'particle', 'suffix']);

export const MorphemeSchema = z.object({
	surface: z.string(),
	dictionaryForm: z.string().optional(),
	role: MorphemeRoleSchema,
	meaning: z.string()
});
export type Morpheme = z.infer<typeof MorphemeSchema>;

export const StructureTokenSchema = z.object({
	id: z.string(),
	value: z.string(),
	type: TokenTypeSchema,
	gloss: z.string(),
	position: z.number().int().nonnegative(),
	morphemes: z.array(MorphemeSchema).optional(),
	conjugation: ConjugationChainSchema.optional()
});
export type StructureToken = z.infer<typeof StructureTokenSchema>;

export const GrammarPatternSchema = z.object({
	pattern: z.string(),
	meaning: z.string(),
	tokenIds: z.array(z.string())
});
export type GrammarPattern = z.infer<typeof GrammarPatternSchema>;

export const StructureAspectSchema = z.object({
	tokens: z.array(StructureTokenSchema),
	particleBridges: z.array(ParticleBridgeSchema),
	grammarNote: GrammarNoteSchema,
	grammarPatterns: z.array(GrammarPatternSchema)
});
export type StructureAspect = z.infer<typeof StructureAspectSchema>;

// ── pronunciation (self-contained; surface refs, not token ids) ─
export const AspectPhoneticNoteSchema = z.object({
	phenomenon: PhoneticPhenomenonSchema,
	description: z.string(),
	surface: z.string().optional()
});
export type AspectPhoneticNote = z.infer<typeof AspectPhoneticNoteSchema>;

export const PronunciationAspectSchema = z.object({
	fullRomanization: z.string(),
	phoneticNotes: z.array(AspectPhoneticNoteSchema)
});
export type PronunciationAspect = z.infer<typeof PronunciationAspectSchema>;

// ── glossary ──────────────────────────────────────────────────
export const GlossaryAspectSchema = z.object({
	entries: z.array(GlossaryEntrySchema)
});
export type GlossaryAspect = z.infer<typeof GlossaryAspectSchema>;

// ── aspect → schema map + result types ────────────────────────
export const ASPECT_SCHEMAS = {
	translation: TranslationAspectSchema,
	structure: StructureAspectSchema,
	pronunciation: PronunciationAspectSchema,
	glossary: GlossaryAspectSchema
} satisfies Record<Aspect, z.ZodType>;

export type AspectResultMap = {
	translation: TranslationAspect;
	structure: StructureAspect;
	pronunciation: PronunciationAspect;
	glossary: GlossaryAspect;
};
export type AspectResult = AspectResultMap[Aspect];
```

- [ ] **Step 5: Run the test to confirm it passes**

Run: `pnpm exec vitest run src/lib/schemas/aspects.test.ts`
Expected: PASS.

- [ ] **Step 6: Verify the type gate**

Run: `pnpm check`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/schemas/aspects.ts src/lib/schemas/aspects.test.ts
git commit -m "feat(aspects): per-aspect schemas + ASPECT_SCHEMAS map"
```

---

### Task 2: Per-aspect prompt builders

**Files:**
- Create: `src/lib/server/llm/prompts/translation.ts`, `structure.ts`, `pronunciation.ts`, `glossary.ts`, `index.ts`
- Test: `src/lib/server/llm/prompts/prompts.test.ts`

**Interfaces:**
- Consumes: `Aspect` from `$lib/schemas/analysis`.
- Produces: `buildTranslationPrompt`, `buildStructurePrompt`, `buildPronunciationPrompt`, `buildGlossaryPrompt` (each `(text: string) => { system: string; prompt: string }`), and `buildAspectPrompt(aspect: Aspect, text: string): { system: string; prompt: string }`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/server/llm/prompts/prompts.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildAspectPrompt } from './index';

describe('buildAspectPrompt', () => {
	it('translation: asks for a natural translation and echoes the text', () => {
		const { system, prompt } = buildAspectPrompt('translation', '저는 학교에 갑니다');
		expect(system.toLowerCase()).toContain('natural');
		expect(prompt).toContain('저는 학교에 갑니다');
	});

	it('structure: states tok_N rule, particle mapping, and morphemes; no romanization', () => {
		const { system } = buildAspectPrompt('structure', '막혔을 때');
		expect(system).toContain('tok_0');
		expect(system).toContain('은/는');
		expect(system.toLowerCase()).toContain('morpheme');
		expect(system.toLowerCase()).not.toContain('romanization');
	});

	it('pronunciation: requires Revised Romanization', () => {
		const { system } = buildAspectPrompt('pronunciation', '먹어요');
		expect(system).toContain('Revised Romanization');
	});

	it('glossary: mentions example sentences', () => {
		const { system } = buildAspectPrompt('glossary', '학교');
		expect(system.toLowerCase()).toContain('example');
	});
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm exec vitest run src/lib/server/llm/prompts/prompts.test.ts`
Expected: FAIL — cannot resolve `./index`.

- [ ] **Step 3: Implement the four builders**

Create `src/lib/server/llm/prompts/translation.ts`:
```ts
export function buildTranslationPrompt(text: string): { system: string; prompt: string } {
	return {
		system: `You translate Korean into English.
RULES:
1. "translation" is a single fluent, natural English translation of the whole input — how a native English speaker would actually say it, NOT a word-by-word literal rendering.
2. "literalGloss" (optional) is a word-order-preserving literal rendering; include it only when it helps a learner.
3. Be deterministic and consistent.
EXAMPLE — Input: "저는 학교에 갑니다"
{ "translation": "I go to school.", "literalGloss": "I-(topic) school-(to) go" }`,
		prompt: `Translate this Korean text: "${text}"`
	};
}
```

Create `src/lib/server/llm/prompts/structure.ts`:
```ts
export function buildStructurePrompt(text: string): { system: string; prompt: string } {
	return {
		system: `You are a Korean morphological and syntactic analyzer. Return structural data only — do NOT include pronunciation; that is handled separately.
RULES:
1. Token IDs must be "tok_0", "tok_1", … matching the "position" index (sequential, no gaps, no duplicates).
2. Particle mapping: 은/는 → particle (topic), 이/가 → particle (subject), 을/를 → particle (object), 에 → particle (location/direction).
3. "morphemes" (optional, per token): decompose inflected forms into ordered parts. Each has role ∈ stem | infix | ending | particle | suffix, a "meaning", and a "dictionaryForm" where applicable. Example: 막혔을 → [{"surface":"막히","dictionaryForm":"막히다","role":"stem","meaning":"to be blocked"},{"surface":"었","role":"infix","meaning":"past tense"},{"surface":"을","role":"ending","meaning":"prospective/attributive"}].
4. "grammarPatterns": named multi-token constructions and the token ids they span. Examples: "-을 때" (when …), "-더라" (retrospective), "-는데" (background/contrast).
5. "particleBridges": link each particle token to the noun/pronoun token it marks, with a "relationLabel".
6. "grammarNote": overall "structure" (e.g. SOV), a short "explanation", and "formalityLevel".
7. Be deterministic and consistent.
EXAMPLE — Input: "저는 학교에 갑니다"
{ "tokens":[{"id":"tok_0","value":"저","type":"pronoun","gloss":"I (humble)","position":0},{"id":"tok_1","value":"는","type":"particle","gloss":"topic marker","position":1},{"id":"tok_2","value":"학교","type":"noun","gloss":"school","position":2},{"id":"tok_3","value":"에","type":"particle","gloss":"to/at (location)","position":3},{"id":"tok_4","value":"갑니다","type":"verb","gloss":"go (formal polite)","position":4,"conjugation":{"dictionaryForm":"가다","stem":"가","politeSuffix":"ㅂ니다","politeForm":"갑니다","steps":[{"label":"Dictionary form","form":"가다"},{"label":"Stem","form":"가"},{"label":"Formal ending","form":"갑니다","note":"가 + ㅂ니다"}]},"morphemes":[{"surface":"가","dictionaryForm":"가다","role":"stem","meaning":"to go"},{"surface":"ㅂ니다","role":"ending","meaning":"formal polite declarative"}]}],"particleBridges":[{"particleTokenId":"tok_1","nounTokenId":"tok_0","relationLabel":"topic"},{"particleTokenId":"tok_3","nounTokenId":"tok_2","relationLabel":"destination"}],"grammarNote":{"structure":"SOV","explanation":"Subject (저는) + Location (학교에) + Verb (갑니다); the verb comes last.","formalityLevel":"formal"},"grammarPatterns":[]}`,
		prompt: `Analyze the structure of this Korean text: "${text}"`
	};
}
```

Create `src/lib/server/llm/prompts/pronunciation.ts`:
```ts
export function buildPronunciationPrompt(text: string): { system: string; prompt: string } {
	return {
		system: `You are a Korean pronunciation guide.
RULES:
1. "fullRomanization": Revised Romanization (NOT McCune-Reischauer) of the entire input.
2. "phoneticNotes": notable sound-change phenomena. "phenomenon" ∈ batchim_assimilation | liaison | nasalization | aspiration | tensification | other. "surface" (optional) is the affected Hangul substring (a string, NOT a token id).
3. Be deterministic and consistent.
EXAMPLE — Input: "먹어요"
{ "fullRomanization":"meogeoyo","phoneticNotes":[{"phenomenon":"liaison","description":"받침 ㄱ links to the following vowel: 머거요","surface":"먹어"}] }`,
		prompt: `Give the pronunciation of this Korean text: "${text}"`
	};
}
```

Create `src/lib/server/llm/prompts/glossary.ts`:
```ts
export function buildGlossaryPrompt(text: string): { system: string; prompt: string } {
	return {
		system: `You build a learner glossary for Korean text.
RULES:
1. One "entries" item per content word worth defining (skip bare particles).
2. Each entry: "headword" (dictionary form), "partOfSpeech", "definition", and up to 3 "exampleSentences" ({ "korean", "english" }). "tokenId" may reference a "tok_N" id when known; otherwise use the headword's first occurrence.
3. Be deterministic and consistent.
EXAMPLE — Input: "저는 학교에 갑니다"
{ "entries":[{"tokenId":"tok_2","headword":"학교","partOfSpeech":"noun","definition":"School (educational institution).","exampleSentences":[{"korean":"학교에 갑니다","english":"I go to school."}]},{"tokenId":"tok_4","headword":"가다","partOfSpeech":"verb","definition":"To go.","exampleSentences":[{"korean":"어디에 가요?","english":"Where are you going?"}]}] }`,
		prompt: `Build a glossary for this Korean text: "${text}"`
	};
}
```

- [ ] **Step 4: Implement the dispatcher**

Create `src/lib/server/llm/prompts/index.ts`:
```ts
import type { Aspect } from '$lib/schemas/analysis';
import { buildTranslationPrompt } from './translation';
import { buildStructurePrompt } from './structure';
import { buildPronunciationPrompt } from './pronunciation';
import { buildGlossaryPrompt } from './glossary';

const BUILDERS: Record<Aspect, (text: string) => { system: string; prompt: string }> = {
	translation: buildTranslationPrompt,
	structure: buildStructurePrompt,
	pronunciation: buildPronunciationPrompt,
	glossary: buildGlossaryPrompt
};

export function buildAspectPrompt(
	aspect: Aspect,
	text: string
): { system: string; prompt: string } {
	return BUILDERS[aspect](text);
}
```

- [ ] **Step 5: Run the test to confirm it passes**

Run: `pnpm exec vitest run src/lib/server/llm/prompts/prompts.test.ts`
Expected: PASS.

- [ ] **Step 6: Verify the type gate**

Run: `pnpm check`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/server/llm/prompts
git commit -m "feat(prompts): per-aspect prompt builders + dispatcher"
```

---

### Task 3: Provider fallback + `parseAspect`

**Files:**
- Create: `src/lib/server/llm/fallback.ts`
- Test: `src/lib/server/llm/fallback.test.ts`
- Modify: `src/lib/server/llm/parse.ts`

**Interfaces:**
- Consumes: `generateObject` (`ai`); `primaryModel`, `fallbackModel` (`./index`); `ASPECT_SCHEMAS`, `AspectResultMap`, `AspectResult` (`$lib/schemas/aspects`); `buildAspectPrompt` (`./prompts`); `Aspect` (`$lib/schemas/analysis`); `tryWithFallback` (`./fallback`).
- Produces: `tryWithFallback<T>(primary, fallback): Promise<T>`; `parseAspect<A extends Aspect>(aspect: A, text: string): Promise<AspectResultMap[A]>`.

- [ ] **Step 1: Write the failing test (fallback helper)**

Create `src/lib/server/llm/fallback.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { tryWithFallback } from './fallback';

describe('tryWithFallback', () => {
	it('returns the primary result and never calls fallback when primary succeeds', async () => {
		const fallback = vi.fn(async () => 'fallback');
		expect(await tryWithFallback(async () => 'primary', fallback)).toBe('primary');
		expect(fallback).not.toHaveBeenCalled();
	});

	it('falls back once when primary throws', async () => {
		const result = await tryWithFallback(
			async () => {
				throw new Error('primary down');
			},
			async () => 'fallback'
		);
		expect(result).toBe('fallback');
	});

	it('rejects with the fallback error when both throw', async () => {
		await expect(
			tryWithFallback(
				async () => {
					throw new Error('primary');
				},
				async () => {
					throw new Error('fallback');
				}
			)
		).rejects.toThrow('fallback');
	});
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm exec vitest run src/lib/server/llm/fallback.test.ts`
Expected: FAIL — cannot resolve `./fallback`.

- [ ] **Step 3: Implement the fallback helper**

Create `src/lib/server/llm/fallback.ts`:
```ts
/**
 * Run `primary`; on any thrown error, run `fallback` once. Mirrors the legacy
 * parseSentence behavior (any error → a single fallback attempt), reusable per
 * aspect. If `fallback` also throws, its error propagates.
 */
export async function tryWithFallback<T>(
	primary: () => Promise<T>,
	fallback: () => Promise<T>
): Promise<T> {
	try {
		return await primary();
	} catch {
		return await fallback();
	}
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `pnpm exec vitest run src/lib/server/llm/fallback.test.ts`
Expected: PASS.

- [ ] **Step 5: Add `parseAspect` to `parse.ts`**

In `src/lib/server/llm/parse.ts`, keep the existing imports and `parseSentence` exactly as they are. Add these imports at the top (after the existing ones):
```ts
import type { Aspect } from '$lib/schemas/analysis';
import { ASPECT_SCHEMAS, type AspectResultMap, type AspectResult } from '$lib/schemas/aspects';
import { buildAspectPrompt } from './prompts';
import { tryWithFallback } from './fallback';
```
Then append this function at the end of the file:
```ts
/**
 * Parse a single aspect of a segment. Selects the aspect's schema + prompt, runs
 * Anthropic (primary) → Gemini (fallback) per aspect via tryWithFallback. One
 * aspect failing does not affect others. Temperature stays 0.1 for cache stability.
 */
export function parseAspect<A extends Aspect>(aspect: A, text: string): Promise<AspectResultMap[A]>;
export async function parseAspect(aspect: Aspect, text: string): Promise<AspectResult> {
	const { system, prompt } = buildAspectPrompt(aspect, text);
	const schema = ASPECT_SCHEMAS[aspect];
	const run = (model: typeof primaryModel | typeof fallbackModel) =>
		generateObject({ model, schema, system, prompt, temperature: 0.1 }).then(
			(r) => r.object as AspectResult
		);
	return tryWithFallback(
		() => run(primaryModel),
		() => run(fallbackModel)
	);
}
```

> `parseAspect` is integration glue — its live LLM behavior is verified manually, and its fallback semantics are covered by `tryWithFallback`'s tests. If `svelte-check` objects to passing the union-typed `schema` into `generateObject`, the `r.object as AspectResult` cast plus the overload signature is the intended shape; do not add a runtime re-validation here (`getAspect` validates on the cache path).

- [ ] **Step 6: Verify the type gate**

Run: `pnpm check`
Expected: `0 errors, 0 warnings`. (Confirms `parseAspect` types and that `parseSentence`/the legacy flow still compile.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/server/llm/fallback.ts src/lib/server/llm/fallback.test.ts src/lib/server/llm/parse.ts
git commit -m "feat(parse): add parseAspect with per-aspect provider fallback"
```

---

### Task 4: Aspect read-through cache

**Files:**
- Create: `src/lib/server/aspect-resolver.ts`
- Test: `src/lib/server/aspect-resolver.test.ts`
- Create: `src/lib/server/aspect-cache.ts`

**Interfaces:**
- Consumes: `AspectResult` (`$lib/schemas/aspects`); in the wrapper: `cacheGet`/`cacheSet` (`./redis`), `segmentAspectKey` (`./cache-keys`), `db` (`./db`), `segmentAspects` (`./db/schema`), `and`/`eq` (`drizzle-orm`), `ASPECT_SCHEMAS` (`$lib/schemas/aspects`), `Aspect` (`$lib/schemas/analysis`).
- Produces: `AspectResolverIO` interface; `resolveAspect(io: AspectResolverIO): Promise<AspectResult>`; `getAspect(segHash: string, aspect: Aspect, compute: () => Promise<AspectResult>): Promise<AspectResult>`.

- [ ] **Step 1: Write the failing test (pure orchestrator)**

Create `src/lib/server/aspect-resolver.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { resolveAspect, type AspectResolverIO } from './aspect-resolver';

// A minimal stand-in value typed as the result; the orchestrator is shape-agnostic.
const VALUE = { translation: 'hi' } as unknown as Awaited<ReturnType<AspectResolverIO['compute']>>;

function io(overrides: Partial<AspectResolverIO>): AspectResolverIO {
	return {
		hotGet: vi.fn(async () => null),
		coldGet: vi.fn(async () => null),
		hotSet: vi.fn(async () => {}),
		coldSet: vi.fn(async () => {}),
		validate: (raw) => raw as never,
		compute: vi.fn(async () => VALUE),
		...overrides
	};
}

describe('resolveAspect', () => {
	it('returns a valid hot hit without touching cold or compute', async () => {
		const i = io({ hotGet: vi.fn(async () => VALUE) });
		expect(await resolveAspect(i)).toBe(VALUE);
		expect(i.coldGet).not.toHaveBeenCalled();
		expect(i.compute).not.toHaveBeenCalled();
	});

	it('on a cold hit, reseeds hot and returns without computing', async () => {
		const i = io({ coldGet: vi.fn(async () => VALUE) });
		expect(await resolveAspect(i)).toBe(VALUE);
		expect(i.hotSet).toHaveBeenCalledWith(VALUE);
		expect(i.compute).not.toHaveBeenCalled();
	});

	it('on a full miss, computes and writes both tiers', async () => {
		const i = io({});
		expect(await resolveAspect(i)).toBe(VALUE);
		expect(i.compute).toHaveBeenCalledOnce();
		expect(i.hotSet).toHaveBeenCalledWith(VALUE);
		expect(i.coldSet).toHaveBeenCalledWith(VALUE);
	});

	it('treats an invalid hot entry as a miss and falls through to cold', async () => {
		const i = io({
			hotGet: vi.fn(async () => ({ corrupt: true })),
			coldGet: vi.fn(async () => VALUE),
			validate: (raw) => ('corrupt' in (raw as object) ? null : (raw as never))
		});
		expect(await resolveAspect(i)).toBe(VALUE);
		expect(i.hotSet).toHaveBeenCalledWith(VALUE);
	});

	it('treats invalid hot and cold as a miss and computes', async () => {
		const i = io({
			hotGet: vi.fn(async () => ({ corrupt: true })),
			coldGet: vi.fn(async () => ({ corrupt: true })),
			validate: () => null
		});
		expect(await resolveAspect(i)).toBe(VALUE);
		expect(i.compute).toHaveBeenCalledOnce();
	});
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm exec vitest run src/lib/server/aspect-resolver.test.ts`
Expected: FAIL — cannot resolve `./aspect-resolver`.

- [ ] **Step 3: Implement the pure orchestrator**

Create `src/lib/server/aspect-resolver.ts`:
```ts
import type { AspectResult } from '$lib/schemas/aspects';

/**
 * IO seams for resolveAspect. Each getter returns the parsed value or null; each
 * setter must be fail-soft (a cache write failure must not throw). `validate`
 * returns the value when a cached payload matches the aspect schema, else null.
 */
export interface AspectResolverIO {
	hotGet: () => Promise<unknown | null>;
	coldGet: () => Promise<unknown | null>;
	hotSet: (value: AspectResult) => Promise<void>;
	coldSet: (value: AspectResult) => Promise<void>;
	validate: (raw: unknown) => AspectResult | null;
	compute: () => Promise<AspectResult>;
}

/**
 * Read-through resolution: Redis (hot) → segment_aspects (cold) → compute.
 * A valid cold hit reseeds hot; a full miss computes once and writes both tiers.
 * Corrupt cached payloads (validate → null) are treated as misses.
 */
export async function resolveAspect(io: AspectResolverIO): Promise<AspectResult> {
	const hot = await io.hotGet();
	if (hot !== null) {
		const valid = io.validate(hot);
		if (valid !== null) return valid;
	}

	const cold = await io.coldGet();
	if (cold !== null) {
		const valid = io.validate(cold);
		if (valid !== null) {
			await io.hotSet(valid);
			return valid;
		}
	}

	const computed = await io.compute();
	await io.hotSet(computed);
	await io.coldSet(computed);
	return computed;
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `pnpm exec vitest run src/lib/server/aspect-resolver.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement the IO wrapper**

Create `src/lib/server/aspect-cache.ts`:
```ts
import type { Aspect } from '$lib/schemas/analysis';
import { ASPECT_SCHEMAS, type AspectResult } from '$lib/schemas/aspects';
import { cacheGet, cacheSet } from './redis';
import { segmentAspectKey } from './cache-keys';
import { db } from './db';
import { segmentAspects } from './db/schema';
import { and, eq } from 'drizzle-orm';
import { resolveAspect } from './aspect-resolver';

const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

/**
 * Read-through cache for one aspect of one segment: Redis (hot) →
 * segment_aspects (cold) → compute. Fail-soft at every tier — a Redis or DB
 * outage degrades to the next tier, never throws to the caller. The aspect's
 * schema validates cached payloads; corrupt entries are treated as misses.
 */
export function getAspect(
	segHash: string,
	aspect: Aspect,
	compute: () => Promise<AspectResult>
): Promise<AspectResult> {
	const key = segmentAspectKey(segHash, aspect);
	const schema = ASPECT_SCHEMAS[aspect];
	const validate = (raw: unknown): AspectResult | null => {
		const parsed = schema.safeParse(raw);
		return parsed.success ? (parsed.data as AspectResult) : null;
	};

	return resolveAspect({
		hotGet: async () => {
			const cached = await cacheGet(key); // cacheGet already swallows Redis errors
			if (!cached) return null;
			try {
				return JSON.parse(cached);
			} catch {
				return null; // corrupt JSON → miss
			}
		},
		coldGet: async () => {
			try {
				const rows = await db
					.select({ result: segmentAspects.result })
					.from(segmentAspects)
					.where(and(eq(segmentAspects.segHash, segHash), eq(segmentAspects.aspect, aspect)))
					.limit(1);
				return rows[0]?.result ?? null;
			} catch {
				return null; // DB outage → miss
			}
		},
		hotSet: async (value) => {
			await cacheSet(key, TTL_SECONDS, JSON.stringify(value)); // cacheSet already swallows errors
		},
		coldSet: async (value) => {
			try {
				await db
					.insert(segmentAspects)
					.values({ segHash, aspect, result: value })
					.onConflictDoUpdate({
						target: [segmentAspects.segHash, segmentAspects.aspect],
						set: { result: value }
					});
			} catch {
				/* a cold-cache write failure must not break the request */
			}
		},
		validate,
		compute
	});
}
```

- [ ] **Step 6: Verify the type gate**

Run: `pnpm check`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/server/aspect-resolver.ts src/lib/server/aspect-resolver.test.ts src/lib/server/aspect-cache.ts
git commit -m "feat(cache): aspect read-through cache (resolveAspect + getAspect)"
```

---

## Self-Review

**Spec coverage (sub-spec 2 design §3–§6):**
- Per-aspect schemas, self-contained, romaja in pronunciation, morphemes + grammarPatterns → Task 1 ✓
- Per-aspect prompt builders + dispatcher → Task 2 ✓
- `parseAspect` with per-aspect Anthropic→Gemini fallback → Task 3 ✓
- `getAspect` read-through cache (Redis → segment_aspects → compute), fail-soft → Task 4 ✓
- Testing: deterministic pieces unit-tested; LLM calls integration-only → Tasks 1–4 (schemas, prompts, `tryWithFallback`, `resolveAspect`) ✓
- Engine not wired into routes; `parseSentence`/`prompt.ts` untouched → enforced by Global Constraints + Task 3 Step 5 (append-only) ✓

**Deferred (not in this plan, per design §1):** SSE route + `/d/<id>` page, aspects→canvas adapter + any `ParsedSentenceSchema` change, legacy `sentence_history` removal → all sub-spec 3.

**Placeholder scan:** none — every step has exact paths, complete code, and runnable commands with expected output.

**Type consistency:** `Aspect` (from `analysis.ts`, Foundation) is the key type for `ASPECT_SCHEMAS` (Task 1), `BUILDERS`/`buildAspectPrompt` (Task 2), `parseAspect` (Task 3), and `getAspect` (Task 4). `AspectResult`/`AspectResultMap` defined in Task 1 are consumed by Tasks 3 and 4. `segmentAspectKey` (Foundation) and `segmentAspects` table (Foundation) are used in Task 4. The `{ system, prompt }` builder shape is identical across Tasks 2 and 3.

**Note on a spec refinement:** the design listed a single `aspect-cache.ts`; this plan splits it into a pure `aspect-resolver.ts` (unit-tested, no `$env` imports) + an IO `aspect-cache.ts`, which is the concrete realization of the design's "unit-tested by injecting fakes" testing approach and matches Foundation's pure-module/`$env`-module separation.
