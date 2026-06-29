# Streaming + Results Flow (Sub-spec 3a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the analysis engine into a streaming, multi-segment, mode-switchable experience — home submit creates a document, `/d/<docId>` streams per-aspect results over SSE — without removing any legacy code.

**Architecture:** Pure helpers (SSE frame formatter, aspect-set resolver, aspects→`ParsedSentence` adapter, document/segment builder) developed test-first; a server action that creates `documents`+`segments`; a `GET /api/analyze` SSE endpoint that streams `getAspect`/`parseAspect` results; a `/d/[docId]` results page of stacked segment cards that fill from one `EventSource`, with mode chips + lazy aspect upgrade. The existing `TopologyCanvas` is reused for structure via the adapter.

**Tech Stack:** SvelteKit 2 + Svelte 5 (runes), TypeScript, Zod 4, Drizzle ORM, ioredis, `@xyflow/svelte`, Vitest.

## Global Constraints

- **Verification gate:** `pnpm check` reports `0 errors, 0 warnings` before any task is done; pure-logic tasks also pass their Vitest run.
- **Additive — remove nothing:** `/canvas`, `sentence_history`, `/history`, `api/favorite`, `api/feedback`, `parseSentence`, `prompt.ts` all stay present and working. (Cutover is sub-spec 3b.)
- **Indentation:** match the file you're editing. `src/routes/+page.svelte` and `InputSandbox.svelte` are **2-space**; `src/routes/canvas/**` and `src/lib/server/**` are **tabs**. New files: match the directory they sit in (server/schemas → tabs; routes mirroring existing 2-space pages → 2-space; new component dirs → tabs to match `src/lib/components/canvas`).
- **Default mode:** `full`. Mode values come from `ModeSchema`/`MODE_ASPECTS` (`$lib/schemas/analysis`).
- **Sanitize, don't restrict:** server uses `normalizeInput` + `containsHangul` (Foundation). No-Hangul input returns a soft hint, not a hard error.
- **Reuse the engine:** `getAspect` (`$lib/server/aspect-cache`), `parseAspect` (`$lib/server/llm/parse`), `segment` (`$lib/server/segment`), `hashText` (`$lib/utils/hash`), `ASPECT_SCHEMAS`/`AspectResult` (`$lib/schemas/aspects`).
- **No per-token romaja; glossary re-keyed by headword; morpheme/grammarPattern visualization deferred** (design §6).
- **Cache is the replay buffer:** the SSE endpoint is idempotent; reconnection re-streams cache hits.

## Worktree setup (once, before Task 1)
- `pnpm install`; ensure `.env` exists (copy from `/home/admin1/workspaces/personal/hanflow/.env` if missing) — gitignored, never commit.

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/schemas/sentence.ts` (modify) | `Token.romanization` → `.optional()` |
| `src/lib/server/sse.ts` (create) | `sseFrame(event, data)` pure formatter |
| `src/lib/server/analyze-aspects.ts` (create) | `resolveAspectSet({mode?, aspects?})` → `Aspect[]` |
| `src/lib/utils/canvas-adapter.ts` (create) | `composeParsedSentence(text, aspects)` → `ParsedSentence` (pure) |
| `src/lib/server/document.ts` (create) | `buildDocumentInput(raw, mode)` → `{ document, segments } | { hint }` (pure) |
| `src/routes/+page.server.ts` (modify) | New action using `buildDocumentInput` → insert → redirect `/d/<docId>` |
| `src/lib/components/sandbox/InputSandbox.svelte` (modify) | Relax gate to "contains Hangul"; add mode chips (default Full) |
| `src/routes/api/analyze/+server.ts` (create) | SSE endpoint |
| `src/routes/d/[docId]/+page.server.ts` (create) | Load document + ordered segments |
| `src/routes/d/[docId]/+page.svelte` (create) | Results page: header, mode chips, stacked cards, stream wiring |
| `src/lib/components/results/SegmentCard.svelte` (create) | Per-segment, per-mode rendering |
| `src/lib/components/results/results.state.svelte.ts` (create) | Client store: aspects by `ordinal`, stream subscribe, lazy upgrade |
| `*.test.ts` | Unit tests for the five pure modules |

---

### Task 1: Make `Token.romanization` optional

**Files:**
- Modify: `src/lib/schemas/sentence.ts`
- Test: `src/lib/schemas/sentence.test.ts`
- Possibly modify: canvas files that read `token.romanization` assuming presence (only if `pnpm check` flags them).

**Interfaces:**
- Produces: `TokenSchema.romanization` is now optional; `Token.romanization?: string`.

- [ ] **Step 1: Worktree setup** (see above): `pnpm install`, ensure `.env`.

- [ ] **Step 2: Write the failing test**

Create `src/lib/schemas/sentence.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { TokenSchema } from './sentence';

describe('TokenSchema.romanization optional', () => {
	const base = { id: 'tok_0', value: '저', type: 'pronoun', gloss: 'I', position: 0 };

	it('parses a token with no romanization', () => {
		const parsed = TokenSchema.parse(base);
		expect(parsed.romanization).toBeUndefined();
	});

	it('still accepts a token with romanization', () => {
		expect(TokenSchema.parse({ ...base, romanization: 'jeo' }).romanization).toBe('jeo');
	});
});
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `pnpm exec vitest run src/lib/schemas/sentence.test.ts`
Expected: FAIL — `romanization` is currently required (`Required` error on the no-romanization case).

- [ ] **Step 4: Make the field optional**

In `src/lib/schemas/sentence.ts`, change the `romanization` line in `TokenSchema` from:
```ts
  romanization: z.string(),   // Revised Romanization
```
to:
```ts
  romanization: z.string().optional(),   // Revised Romanization (absent in the aspect-based flow)
```

- [ ] **Step 5: Run the test to confirm it passes**

Run: `pnpm exec vitest run src/lib/schemas/sentence.test.ts`
Expected: PASS.

- [ ] **Step 6: Fix any now-broken romanization consumers**

Run: `pnpm check`
If it reports errors where `token.romanization` is used as a definite `string` (e.g. in a canvas node component or the sidebar), guard each with a conditional render / `?? ''`. Make the minimal change to restore `0 errors, 0 warnings` — render romaja only `{#if token.romanization}`. Do not restructure. If `pnpm check` is already clean, skip.
Expected after fixes: `0 errors, 0 warnings`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/schemas/sentence.ts src/lib/schemas/sentence.test.ts
# plus any canvas files touched in Step 6
git commit -m "feat(schema): make Token.romanization optional for the aspect flow"
```

---

### Task 2: SSE frame formatter

**Files:**
- Create: `src/lib/server/sse.ts`
- Test: `src/lib/server/sse.test.ts`

**Interfaces:**
- Produces: `sseFrame(event: string, data: unknown): string` — a single SSE frame: `event: <name>\n` + `data: <json>\n\n`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/server/sse.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { sseFrame } from './sse';

describe('sseFrame', () => {
	it('formats an event + JSON data frame ending in a blank line', () => {
		expect(sseFrame('aspect', { ordinal: 0, aspect: 'translation' })).toBe(
			'event: aspect\ndata: {"ordinal":0,"aspect":"translation"}\n\n'
		);
	});

	it('serializes an empty object for done', () => {
		expect(sseFrame('done', {})).toBe('event: done\ndata: {}\n\n');
	});
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm exec vitest run src/lib/server/sse.test.ts`
Expected: FAIL — cannot resolve `./sse`.

- [ ] **Step 3: Implement**

Create `src/lib/server/sse.ts`:
```ts
/**
 * Format a single Server-Sent Events frame: a named event with a JSON payload,
 * terminated by the blank line that delimits SSE messages.
 */
export function sseFrame(event: string, data: unknown): string {
	return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `pnpm exec vitest run src/lib/server/sse.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/sse.ts src/lib/server/sse.test.ts
git commit -m "feat(sse): add SSE frame formatter"
```

---

### Task 3: Aspect-set resolver

**Files:**
- Create: `src/lib/server/analyze-aspects.ts`
- Test: `src/lib/server/analyze-aspects.test.ts`

**Interfaces:**
- Consumes: `MODE_ASPECTS`, `ModeSchema`, `AspectSchema`, `Aspect` (`$lib/schemas/analysis`).
- Produces: `resolveAspectSet(params: { mode?: string | null; aspects?: string | null }): Aspect[]` — returns the aspect list for a valid `mode`, else the parsed `aspects` csv (filtered to valid `Aspect`s), else `MODE_ASPECTS.full` as the default. De-duplicated.

- [ ] **Step 1: Write the failing test**

Create `src/lib/server/analyze-aspects.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { resolveAspectSet } from './analyze-aspects';

describe('resolveAspectSet', () => {
	it('expands a valid mode to its aspect bundle', () => {
		expect(resolveAspectSet({ mode: 'breakdown' })).toEqual(['structure', 'translation']);
	});

	it('parses an explicit aspects csv, keeping only valid aspects', () => {
		expect(resolveAspectSet({ aspects: 'glossary,bogus,translation' })).toEqual([
			'glossary',
			'translation'
		]);
	});

	it('prefers mode over aspects when both are present', () => {
		expect(resolveAspectSet({ mode: 'translate', aspects: 'glossary' })).toEqual(['translation']);
	});

	it('defaults to full when neither is valid', () => {
		expect(resolveAspectSet({ mode: 'nonsense' })).toEqual([
			'translation',
			'structure',
			'pronunciation',
			'glossary'
		]);
		expect(resolveAspectSet({})).toEqual([
			'translation',
			'structure',
			'pronunciation',
			'glossary'
		]);
	});

	it('de-duplicates', () => {
		expect(resolveAspectSet({ aspects: 'translation,translation' })).toEqual(['translation']);
	});
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm exec vitest run src/lib/server/analyze-aspects.test.ts`
Expected: FAIL — cannot resolve `./analyze-aspects`.

- [ ] **Step 3: Implement**

Create `src/lib/server/analyze-aspects.ts`:
```ts
import { MODE_ASPECTS, ModeSchema, AspectSchema, type Aspect } from '$lib/schemas/analysis';

/**
 * Resolve which aspects an /api/analyze request should compute. A valid `mode`
 * expands to its bundle; otherwise an explicit `aspects` csv is used (invalid
 * names dropped); otherwise the default is the full bundle. Result is de-duped.
 */
export function resolveAspectSet(params: { mode?: string | null; aspects?: string | null }): Aspect[] {
	const mode = ModeSchema.safeParse(params.mode);
	if (mode.success) return [...new Set(MODE_ASPECTS[mode.data])];

	if (params.aspects) {
		const parsed = params.aspects
			.split(',')
			.map((a) => a.trim())
			.map((a) => AspectSchema.safeParse(a))
			.filter((r) => r.success)
			.map((r) => r.data);
		if (parsed.length > 0) return [...new Set(parsed)];
	}

	return [...new Set(MODE_ASPECTS.full)];
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `pnpm exec vitest run src/lib/server/analyze-aspects.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify the type gate**

Run: `pnpm check`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/analyze-aspects.ts src/lib/server/analyze-aspects.test.ts
git commit -m "feat(analyze): aspect-set resolver for mode/aspects"
```

---

### Task 4: aspects → `ParsedSentence` adapter

**Files:**
- Create: `src/lib/utils/canvas-adapter.ts`
- Test: `src/lib/utils/canvas-adapter.test.ts`

**Interfaces:**
- Consumes: `ParsedSentence`, `Token`, `GlossaryEntry` (`$lib/schemas/sentence`); `StructureAspect`, `TranslationAspect`, `GlossaryAspect` (`$lib/schemas/aspects`).
- Produces: `composeParsedSentence(input: { text: string; structure?: StructureAspect; translation?: TranslationAspect; glossary?: GlossaryAspect }): ParsedSentence`.

Mapping rules (design §6): tokens map `id/value/type/gloss/position/conjugation` (no `romanization`); `particleBridges` + `grammarNote` straight from structure (or a neutral default grammar note when structure absent); `translation` from the translation aspect; `phoneticNotes: []` (phonetics render in the pronounce view, not the canvas); glossary entries **re-keyed by headword** — each entry's `tokenId` is rewritten to the id of the first token whose `value` contains the headword, else left as-is.

- [ ] **Step 1: Write the failing test**

Create `src/lib/utils/canvas-adapter.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { composeParsedSentence } from './canvas-adapter';
import type { StructureAspect } from '$lib/schemas/aspects';

const structure: StructureAspect = {
	tokens: [
		{ id: 'tok_0', value: '학교', type: 'noun', gloss: 'school', position: 0 },
		{ id: 'tok_1', value: '에', type: 'particle', gloss: 'to', position: 1 }
	],
	particleBridges: [{ particleTokenId: 'tok_1', nounTokenId: 'tok_0', relationLabel: 'destination' }],
	grammarNote: { structure: 'other', explanation: 'fragment', formalityLevel: 'polite' },
	grammarPatterns: []
};

describe('composeParsedSentence', () => {
	it('maps structure tokens without romanization and keeps bridges/grammar', () => {
		const ps = composeParsedSentence({ text: '학교에', structure });
		expect(ps.originalText).toBe('학교에');
		expect(ps.tokens.map((t) => t.id)).toEqual(['tok_0', 'tok_1']);
		expect(ps.tokens[0].romanization).toBeUndefined();
		expect(ps.particleBridges).toHaveLength(1);
		expect(ps.phoneticNotes).toEqual([]);
	});

	it('fills translation from the translation aspect', () => {
		const ps = composeParsedSentence({
			text: '학교에',
			structure,
			translation: { translation: 'to school' }
		});
		expect(ps.translation).toBe('to school');
	});

	it('re-keys glossary entries by headword match, not the aspect tokenId', () => {
		const ps = composeParsedSentence({
			text: '학교에',
			structure,
			glossary: {
				entries: [
					{
						tokenId: 'tok_99', // wrong id from an independent glossary call
						headword: '학교',
						partOfSpeech: 'noun',
						definition: 'school',
						exampleSentences: []
					}
				]
			}
		});
		expect(ps.glossary[0].tokenId).toBe('tok_0'); // re-keyed to the matching token
	});

	it('produces a renderable ParsedSentence even with structure absent', () => {
		const ps = composeParsedSentence({ text: '학교에', translation: { translation: 'to school' } });
		expect(ps.tokens).toEqual([]);
		expect(ps.grammarNote.structure).toBe('other');
		expect(ps.translation).toBe('to school');
	});
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm exec vitest run src/lib/utils/canvas-adapter.test.ts`
Expected: FAIL — cannot resolve `./canvas-adapter`.

- [ ] **Step 3: Implement**

Create `src/lib/utils/canvas-adapter.ts`:
```ts
import type { ParsedSentence, Token, GlossaryEntry } from '$lib/schemas/sentence';
import type { StructureAspect, TranslationAspect, GlossaryAspect } from '$lib/schemas/aspects';

const NEUTRAL_GRAMMAR_NOTE = {
	structure: 'other' as const,
	explanation: '',
	formalityLevel: 'polite' as const
};

/**
 * Compose the per-aspect engine outputs into the legacy ParsedSentence shape the
 * TopologyCanvas consumes. Romanization is intentionally absent (it lives in the
 * pronunciation aspect / pronounce view). Glossary entries are re-keyed by
 * headword because token ids are not comparable across independent aspect calls.
 * Phonetic notes are not pushed through the canvas (rendered in the pronounce view).
 */
export function composeParsedSentence(input: {
	text: string;
	structure?: StructureAspect;
	translation?: TranslationAspect;
	glossary?: GlossaryAspect;
}): ParsedSentence {
	const tokens: Token[] = (input.structure?.tokens ?? []).map((t) => ({
		id: t.id,
		value: t.value,
		type: t.type,
		gloss: t.gloss,
		position: t.position,
		...(t.conjugation ? { conjugation: t.conjugation } : {})
	}));

	const glossary: GlossaryEntry[] = (input.glossary?.entries ?? []).map((e) => {
		const match = tokens.find((t) => t.value.includes(e.headword));
		return match ? { ...e, tokenId: match.id } : e;
	});

	return {
		originalText: input.text,
		translation: input.translation?.translation,
		tokens,
		particleBridges: input.structure?.particleBridges ?? [],
		phoneticNotes: [],
		grammarNote: input.structure?.grammarNote ?? NEUTRAL_GRAMMAR_NOTE,
		glossary
	};
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `pnpm exec vitest run src/lib/utils/canvas-adapter.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify the type gate**

Run: `pnpm check`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils/canvas-adapter.ts src/lib/utils/canvas-adapter.test.ts
git commit -m "feat(adapter): aspects → ParsedSentence canvas adapter"
```

---

### Task 5: Document/segment build helper

**Files:**
- Create: `src/lib/server/document.ts`
- Test: `src/lib/server/document.test.ts`

**Interfaces:**
- Consumes: `normalizeInput`, `containsHangul` (`$lib/server/korean`); `segment` (`$lib/server/segment`); `hashText` (`$lib/utils/hash`); `Mode` (`$lib/schemas/analysis`).
- Produces:
  - `type BuiltDocument = { normalized: string; docHash: string; segments: { segHash: string; segmentText: string; unitType: string; ordinal: number }[]; truncated: boolean; totalUnits: number }`
  - `buildDocumentInput(raw: string, mode: Mode): Promise<{ ok: true; doc: BuiltDocument } | { ok: false; hint: string }>` — normalizes, gates on Hangul (soft hint when absent or empty), segments, and hashes the document + each segment.

- [ ] **Step 1: Write the failing test**

Create `src/lib/server/document.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildDocumentInput } from './document';

describe('buildDocumentInput', () => {
	it('builds a document with hashed ordered segments', async () => {
		const r = await buildDocumentInput('저는 학교에 갑니다. 고양이가 물을 마셔요.', 'full');
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.doc.segments).toHaveLength(2);
		expect(r.doc.segments.map((s) => s.ordinal)).toEqual([0, 1]);
		expect(r.doc.docHash).toMatch(/^[0-9a-f]{64}$/);
		expect(r.doc.segments[0].segHash).toMatch(/^[0-9a-f]{64}$/);
		expect(r.doc.segments[0].unitType).toBe('sentence');
	});

	it('returns a soft hint for input with no Hangul', async () => {
		const r = await buildDocumentInput('hello world', 'full');
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.hint.length).toBeGreaterThan(0);
	});

	it('returns a soft hint for empty input', async () => {
		const r = await buildDocumentInput('   ', 'full');
		expect(r.ok).toBe(false);
	});

	it('hashes identical segment text to the same segHash (cross-document reuse)', async () => {
		const a = await buildDocumentInput('고양이가 물을 마셔요.', 'full');
		const b = await buildDocumentInput('고양이가 물을 마셔요.', 'full');
		if (!a.ok || !b.ok) throw new Error('expected ok');
		expect(a.doc.segments[0].segHash).toBe(b.doc.segments[0].segHash);
	});
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm exec vitest run src/lib/server/document.test.ts`
Expected: FAIL — cannot resolve `./document`.

- [ ] **Step 3: Implement**

Create `src/lib/server/document.ts`:
```ts
import { normalizeInput, containsHangul } from './korean';
import { segment } from './segment';
import { hashText } from '$lib/utils/hash';
import type { Mode } from '$lib/schemas/analysis';

export interface BuiltSegment {
	segHash: string;
	segmentText: string;
	unitType: string;
	ordinal: number;
}

export interface BuiltDocument {
	normalized: string;
	docHash: string;
	segments: BuiltSegment[];
	truncated: boolean;
	totalUnits: number;
}

const NO_KOREAN_HINT = 'No Korean detected — enter some 한글 to analyze.';

/**
 * Normalize + gate + segment + hash raw input into an insertable document. Returns
 * a soft hint (not an error) when the input has no Hangul, honoring the
 * sanitize-don't-restrict rule. `mode` is recorded as the document's default mode.
 */
export async function buildDocumentInput(
	raw: string,
	mode: Mode
): Promise<{ ok: true; doc: BuiltDocument } | { ok: false; hint: string }> {
	const normalized = normalizeInput(raw);
	if (!normalized || !containsHangul(normalized)) {
		return { ok: false, hint: NO_KOREAN_HINT };
	}

	const { segments, totalUnits, truncated } = segment(normalized);
	const docHash = await hashText(normalized);
	const built: BuiltSegment[] = await Promise.all(
		segments.map(async (s) => ({
			segHash: await hashText(s.text),
			segmentText: s.text,
			unitType: s.unitType,
			ordinal: s.ordinal
		}))
	);

	// `mode` is recorded by the caller as document.defaultMode; surfaced here so the
	// builder is the single place input shaping happens.
	void mode;
	return { ok: true, doc: { normalized, docHash, segments: built, truncated, totalUnits } };
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `pnpm exec vitest run src/lib/server/document.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify the type gate**

Run: `pnpm check`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/document.ts src/lib/server/document.test.ts
git commit -m "feat(document): build document + hashed segments from raw input"
```

---

### Task 6: Home action + InputSandbox mode chips

**Files:**
- Modify: `src/routes/+page.server.ts`
- Modify: `src/lib/components/sandbox/InputSandbox.svelte`

**Interfaces:**
- Consumes: `buildDocumentInput` (Task 5); `db`, `documents`, `segments` (`$lib/server/db`, `./schema`); `ModeSchema` (`$lib/schemas/analysis`).
- Produces: a `default` action that inserts a document + segments and redirects to `/d/<docId>?mode=<mode>`; on no-Hangul returns `fail(422, { error })`. (This is an integration task — verified by `pnpm check` + the final manual run; no unit test.)

- [ ] **Step 1: Rewrite the action**

Replace the body of the `default` action in `src/routes/+page.server.ts` with the new flow. Keep the file's existing import style; the new action reads:
```ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { ModeSchema } from '$lib/schemas/analysis';
import { buildDocumentInput } from '$lib/server/document';
import { db } from '$lib/server/db';
import { documents, segments } from '$lib/server/db/schema';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const data = await request.formData();
		const raw = (data.get('sentence') as string | null) ?? '';
		const modeParse = ModeSchema.safeParse(data.get('mode'));
		const mode = modeParse.success ? modeParse.data : 'full';

		const built = await buildDocumentInput(raw, mode);
		if (!built.ok) return fail(422, { error: built.hint });

		const session = await locals.auth();
		const [doc] = await db
			.insert(documents)
			.values({
				userId: session?.user?.id ?? null,
				docHash: built.doc.docHash,
				rawInput: raw,
				normalizedInput: built.doc.normalized,
				defaultMode: mode
			})
			.returning({ id: documents.id });

		await db.insert(segments).values(
			built.doc.segments.map((s) => ({
				documentId: doc.id,
				segHash: s.segHash,
				segmentText: s.segmentText,
				unitType: s.unitType,
				ordinal: s.ordinal
			}))
		);

		redirect(303, `/d/${doc.id}?mode=${mode}`);
	}
};
```
> Note: this replaces the old `/canvas`-redirect action. The `/canvas` route file itself is left in place (still reachable directly), per the additive constraint.

- [ ] **Step 2: Add mode chips + relax the gate in `InputSandbox.svelte`**

In `src/lib/components/sandbox/InputSandbox.svelte` (2-space file):
- Change the client validation so it only blocks **empty** input and shows a soft hint when there's no Hangul, instead of hard-blocking non-Hangul. Replace the `HANGUL_RE`/`validate` logic with a contains-Hangul check:
```ts
  // Accept anything containing some Hangul; sanitization happens server-side.
  const HANGUL_RE = /[가-힣ㄱ-ㆎ]/u;
  function hint(text: string) {
    const t = text.trim();
    if (!t) return '';
    return HANGUL_RE.test(t) ? '' : 'Enter some Korean (한글) to analyze';
  }
  let clientHint = $derived(hint(value));

  const MODES = [
    { id: 'full', label: 'Full' },
    { id: 'breakdown', label: 'Breakdown' },
    { id: 'pronounce', label: 'Pronounce' },
    { id: 'translate', label: 'Translate' }
  ];
  let mode = $state('full');
```
- Add a hidden field so the action receives the mode, and a chip row above the submit button:
```svelte
    <input type="hidden" name="mode" value={mode} />

    <div class="mode-chips" role="group" aria-label="Analysis mode">
      {#each MODES as m (m.id)}
        <button
          type="button"
          class="mode-chip"
          class:selected={mode === m.id}
          aria-pressed={mode === m.id}
          onclick={() => (mode = m.id)}
        >
          {m.label}
        </button>
      {/each}
    </div>
```
- Update the submit button's `disabled` to use `!value.trim()` (drop the hard Hangul block); keep showing `clientHint`/`actionData?.error`. Keep the existing `enhance`/`parsing`/`recents` behavior. Style `.mode-chips`/`.mode-chip` with existing tokens (mirror the `.chip` styles already in the file; `.selected` uses `--color-accent-primary`).

- [ ] **Step 3: Verify the type gate**

Run: `pnpm check`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 4: Commit**

```bash
git add src/routes/+page.server.ts src/lib/components/sandbox/InputSandbox.svelte
git commit -m "feat(home): submit to the new document flow with mode chips"
```

---

### Task 7: `/api/analyze` SSE endpoint

**Files:**
- Create: `src/routes/api/analyze/+server.ts`

**Interfaces:**
- Consumes: `resolveAspectSet` (Task 3); `sseFrame` (Task 2); `getAspect` (`$lib/server/aspect-cache`); `parseAspect` (`$lib/server/llm/parse`); `db`, `documents`, `segments` (`$lib/server/db`); `eq`, `asc` (`drizzle-orm`).
- Produces: `GET` handler returning `text/event-stream`. (Integration — verified by `pnpm check` + manual run.)

- [ ] **Step 1: Implement the endpoint**

Create `src/routes/api/analyze/+server.ts`:
```ts
import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { eq, asc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { documents, segments } from '$lib/server/db/schema';
import { resolveAspectSet } from '$lib/server/analyze-aspects';
import { sseFrame } from '$lib/server/sse';
import { getAspect } from '$lib/server/aspect-cache';
import { parseAspect } from '$lib/server/llm/parse';

const CONCURRENCY = 4;

export const GET: RequestHandler = async ({ url }) => {
	const docId = url.searchParams.get('doc');
	if (!docId) error(400, 'missing doc');

	const docRows = await db
		.select({ id: documents.id })
		.from(documents)
		.where(eq(documents.id, docId))
		.limit(1);
	if (docRows.length === 0) error(404, 'document not found');

	const segRows = await db
		.select({
			ordinal: segments.ordinal,
			segHash: segments.segHash,
			segmentText: segments.segmentText
		})
		.from(segments)
		.where(eq(segments.documentId, docId))
		.orderBy(asc(segments.ordinal));

	const aspects = resolveAspectSet({
		mode: url.searchParams.get('mode'),
		aspects: url.searchParams.get('aspects')
	});

	// One unit of work = one (segment, aspect) pair.
	const jobs = segRows.flatMap((seg) => aspects.map((aspect) => ({ seg, aspect })));

	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			const encoder = new TextEncoder();
			const send = (event: string, data: unknown) =>
				controller.enqueue(encoder.encode(sseFrame(event, data)));

			let cursor = 0;
			async function worker() {
				while (cursor < jobs.length) {
					const { seg, aspect } = jobs[cursor++];
					try {
						const result = await getAspect(seg.segHash, aspect, () =>
							parseAspect(aspect, seg.segmentText)
						);
						send('aspect', { ordinal: seg.ordinal, segHash: seg.segHash, aspect, result });
					} catch (e) {
						send('aspect_error', {
							ordinal: seg.ordinal,
							aspect,
							message: e instanceof Error ? e.message : 'analysis failed'
						});
					}
				}
			}

			await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker));
			send('done', {});
			controller.close();
		}
	});

	return new Response(stream, {
		headers: {
			'content-type': 'text/event-stream',
			'cache-control': 'no-cache',
			connection: 'keep-alive'
		}
	});
};
```

- [ ] **Step 2: Verify the type gate**

Run: `pnpm check`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 3: Commit**

```bash
git add src/routes/api/analyze/+server.ts
git commit -m "feat(api): /api/analyze SSE endpoint streaming per-aspect results"
```

---

### Task 8: `/d/[docId]` load + page + SegmentCard

**Files:**
- Create: `src/routes/d/[docId]/+page.server.ts`
- Create: `src/routes/d/[docId]/+page.svelte`
- Create: `src/lib/components/results/SegmentCard.svelte`

**Interfaces:**
- Consumes: `db`, `documents`, `segments` (`$lib/server/db`); `eq`, `asc` (`drizzle-orm`); `composeParsedSentence` (Task 4); `TopologyCanvas`, `SpeakButton`; `AspectResult` types (`$lib/schemas/aspects`).
- Produces: `load` returning `{ document, segments }`; a results page that renders a `SegmentCard` per segment from a per-ordinal aspect store (wired live in Task 9 — for this task, the page renders cards with whatever the store holds; the store is created in Task 9).

> Tasks 8 and 9 share `results.state.svelte.ts`. To keep Task 8 independently testable via `pnpm check`, Task 8 creates a minimal store stub that Task 9 fills in. Define the store's shape here (Task 9 implements the streaming).

- [ ] **Step 1: Load the document + segments**

Create `src/routes/d/[docId]/+page.server.ts`:
```ts
import { redirect } from '@sveltejs/kit';
import { eq, asc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { documents, segments } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ params }) => {
	const docRows = await db
		.select({
			id: documents.id,
			rawInput: documents.rawInput,
			defaultMode: documents.defaultMode
		})
		.from(documents)
		.where(eq(documents.id, params.docId))
		.limit(1);
	if (docRows.length === 0) redirect(303, '/');

	const segRows = await db
		.select({
			ordinal: segments.ordinal,
			segHash: segments.segHash,
			segmentText: segments.segmentText,
			unitType: segments.unitType
		})
		.from(segments)
		.where(eq(segments.documentId, params.docId))
		.orderBy(asc(segments.ordinal));

	return { document: docRows[0], segments: segRows };
};
```

- [ ] **Step 2: Create the results store (shape + stub)**

Create `src/lib/components/results/results.state.svelte.ts`:
```ts
import type { Aspect } from '$lib/schemas/analysis';
import type { AspectResult } from '$lib/schemas/aspects';

// Aspects received for one segment, keyed by aspect name.
export type SegmentAspects = Partial<Record<Aspect, AspectResult>>;

export interface ResultsState {
	get(ordinal: number): SegmentAspects;
	readonly done: boolean;
}

/**
 * Holds streamed aspect results keyed by segment ordinal. Task 9 wires the live
 * EventSource + mode upgrade into this factory; Task 8 renders from `get()`.
 */
export function createResultsState() {
	const byOrdinal = $state<Record<number, SegmentAspects>>({});
	let done = $state(false);

	return {
		get: (ordinal: number): SegmentAspects => byOrdinal[ordinal] ?? {},
		set(ordinal: number, aspect: Aspect, result: AspectResult) {
			byOrdinal[ordinal] = { ...(byOrdinal[ordinal] ?? {}), [aspect]: result };
		},
		markDone() {
			done = true;
		},
		get done() {
			return done;
		}
	};
}
```

- [ ] **Step 3: Create `SegmentCard.svelte`**

Create `src/lib/components/results/SegmentCard.svelte` (tabs, to match the `components/canvas` dir):
```svelte
<script lang="ts">
	import TopologyCanvas from '$lib/components/canvas/TopologyCanvas.svelte';
	import SpeakButton from '$lib/components/ui/SpeakButton.svelte';
	import { composeParsedSentence } from '$lib/utils/canvas-adapter';
	import type { Mode } from '$lib/schemas/analysis';
	import type {
		StructureAspect,
		TranslationAspect,
		PronunciationAspect,
		GlossaryAspect
	} from '$lib/schemas/aspects';
	import type { SegmentAspects } from './results.state.svelte';

	let {
		text,
		unitType,
		mode,
		aspects
	}: { text: string; unitType: string; mode: Mode; aspects: SegmentAspects } = $props();

	let translation = $derived(aspects.translation as TranslationAspect | undefined);
	let structure = $derived(aspects.structure as StructureAspect | undefined);
	let pronunciation = $derived(aspects.pronunciation as PronunciationAspect | undefined);
	let glossary = $derived(aspects.glossary as GlossaryAspect | undefined);

	let showStructure = $derived(mode === 'breakdown' || mode === 'full');
	let showPronunciation = $derived(mode === 'pronounce' || mode === 'full');
	let showGlossary = $derived(mode === 'full');

	let parsed = $derived(
		structure ? composeParsedSentence({ text, structure, translation, glossary }) : null
	);
	let expanded = $state(false);
</script>

<article class="segment-card">
	<header class="segment-head">
		<span class="seg-text">{text}</span>
		<span class="unit-badge">{unitType}</span>
		<div class="segment-actions">
			<SpeakButton {text} label="Play pronunciation of this segment" />
		</div>
	</header>

	{#if translation}
		<p class="translation">{translation.translation}</p>
	{/if}

	{#if showPronunciation}
		{#if pronunciation}
			<div class="pronunciation">
				<p class="romaja">{pronunciation.fullRomanization}</p>
				{#each pronunciation.phoneticNotes as note (note.description)}
					<p class="phonetic-note">
						<strong>{note.phenomenon}:</strong> {note.description}
					</p>
				{/each}
			</div>
		{:else}
			<p class="loading">Loading pronunciation…</p>
		{/if}
	{/if}

	{#if showStructure}
		{#if parsed}
			<button type="button" class="expand-toggle" onclick={() => (expanded = !expanded)}>
				{expanded ? 'Hide' : 'Show'} breakdown
			</button>
			{#if expanded}
				<div class="canvas-wrap">
					<TopologyCanvas parsedSentence={parsed} />
				</div>
			{/if}
		{:else}
			<p class="loading">Loading breakdown…</p>
		{/if}
	{/if}

	{#if showGlossary}
		{#if glossary}
			<ul class="glossary">
				{#each glossary.entries as entry (entry.headword)}
					<li><strong>{entry.headword}</strong> — {entry.definition}</li>
				{/each}
			</ul>
		{:else}
			<p class="loading">Loading glossary…</p>
		{/if}
	{/if}
</article>

<style>
	.segment-card {
		border: 1px solid var(--color-edge);
		border-radius: var(--radius-node, 10px);
		background: var(--color-bg-surface);
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.segment-head {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.seg-text {
		font-size: 1.125rem;
		color: var(--color-text-primary);
		flex: 1;
	}
	.unit-badge {
		font-size: 0.6875rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-muted);
		border: 1px solid var(--color-edge);
		border-radius: 100px;
		padding: 0.125rem 0.5rem;
	}
	.segment-actions {
		display: flex;
		gap: 0.25rem;
	}
	.translation {
		color: var(--color-text-primary);
		margin: 0;
	}
	.romaja {
		color: var(--color-text-secondary);
		font-style: italic;
		margin: 0 0 0.25rem;
	}
	.phonetic-note {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		margin: 0.125rem 0;
	}
	.expand-toggle {
		align-self: flex-start;
		background: none;
		border: 1px solid var(--color-edge);
		border-radius: 8px;
		color: var(--color-accent-primary);
		padding: 0.375rem 0.75rem;
		cursor: pointer;
		font: inherit;
	}
	.canvas-wrap {
		height: 360px;
		border: 1px solid var(--color-edge);
		border-radius: 8px;
		overflow: hidden;
	}
	.glossary {
		margin: 0;
		padding-left: 1.25rem;
		color: var(--color-text-secondary);
		font-size: 0.9375rem;
	}
	.loading {
		color: var(--color-text-muted);
		font-size: 0.875rem;
		margin: 0;
	}
</style>
```

- [ ] **Step 4: Create the page**

Create `src/routes/d/[docId]/+page.svelte`:
```svelte
<script lang="ts">
	import { page } from '$app/state';
	import SegmentCard from '$lib/components/results/SegmentCard.svelte';
	import { createResultsState } from '$lib/components/results/results.state.svelte';
	import { ModeSchema, type Mode } from '$lib/schemas/analysis';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const MODES: { id: Mode; label: string }[] = [
		{ id: 'full', label: 'Full' },
		{ id: 'breakdown', label: 'Breakdown' },
		{ id: 'pronounce', label: 'Pronounce' },
		{ id: 'translate', label: 'Translate' }
	];

	const urlMode = ModeSchema.safeParse(page.url.searchParams.get('mode'));
	let mode = $state<Mode>(urlMode.success ? urlMode.data : 'full');

	const results = createResultsState();
	// Task 9 wires the live stream into `results` (reacting to `mode`).
</script>

<svelte:head><title>{data.document.rawInput} — HanFlow</title></svelte:head>

<div class="results-page">
	<header class="results-header">
		<a href="/" class="back-link">← New analysis</a>
		<p class="doc-input">{data.document.rawInput}</p>
		<div class="mode-chips" role="group" aria-label="Analysis mode">
			{#each MODES as m (m.id)}
				<button
					type="button"
					class="mode-chip"
					class:selected={mode === m.id}
					aria-pressed={mode === m.id}
					onclick={() => (mode = m.id)}
				>
					{m.label}
				</button>
			{/each}
		</div>
	</header>

	<div class="segment-list">
		{#each data.segments as seg (seg.ordinal)}
			<SegmentCard
				text={seg.segmentText}
				unitType={seg.unitType}
				{mode}
				aspects={results.get(seg.ordinal)}
			/>
		{/each}
	</div>
</div>

<style>
	.results-page {
		max-width: 880px;
		margin: 0 auto;
		padding: 1.5rem 1rem 3rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.results-header {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.back-link {
		color: var(--color-accent-primary);
		text-decoration: none;
		font-size: 0.875rem;
	}
	.doc-input {
		color: var(--color-text-primary);
		font-size: 1.25rem;
		margin: 0;
	}
	.mode-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.mode-chip {
		padding: 0.375rem 0.875rem;
		border: 1px solid var(--color-edge);
		border-radius: 100px;
		background: var(--color-bg-surface);
		color: var(--color-text-secondary);
		font: inherit;
		font-size: 0.875rem;
		cursor: pointer;
	}
	.mode-chip.selected {
		border-color: var(--color-accent-primary);
		color: #fff;
		background: var(--color-accent-primary);
	}
	.segment-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
</style>
```

- [ ] **Step 5: Verify the type gate**

Run: `pnpm check`
Expected: `0 errors, 0 warnings`. (Cards render their "Loading…" states until Task 9 wires the stream.)

- [ ] **Step 6: Commit**

```bash
git add src/routes/d/[docId]/+page.server.ts src/routes/d/[docId]/+page.svelte src/lib/components/results/SegmentCard.svelte src/lib/components/results/results.state.svelte.ts
git commit -m "feat(results): /d/[docId] page + SegmentCard (static render)"
```

---

### Task 9: Live stream wiring + mode switching + lazy upgrade

**Files:**
- Modify: `src/lib/components/results/results.state.svelte.ts`
- Modify: `src/routes/d/[docId]/+page.svelte`

**Interfaces:**
- Consumes: `MODE_ASPECTS`, `type Mode`, `type Aspect` (`$lib/schemas/analysis`); `AspectSchema`/`ASPECT_SCHEMAS` if validating (optional).
- Produces: the results state opens an `EventSource` to `/api/analyze`, routes `aspect` events into the per-ordinal store, and exposes a `requestMode(mode)` that opens a follow-up stream for only the not-yet-received aspects (lazy upgrade). (Integration — verified by `pnpm check` + the final manual run.)

- [ ] **Step 1: Extend the results store with streaming**

Replace `createResultsState` in `src/lib/components/results/results.state.svelte.ts` so it manages an `EventSource` and tracks which aspects have been requested. Full file:
```ts
import { MODE_ASPECTS, type Aspect, type Mode } from '$lib/schemas/analysis';
import type { AspectResult } from '$lib/schemas/aspects';

export type SegmentAspects = Partial<Record<Aspect, AspectResult>>;

/**
 * Streams /api/analyze results into a per-ordinal store. Opens one stream for the
 * initial mode; switching to a richer mode opens a follow-up stream for only the
 * aspects not yet requested (lazy upgrade). Cache hits stream back immediately,
 * so re-requesting an already-cached aspect is cheap and idempotent.
 */
export function createResultsState(docId: string, initialMode: Mode) {
	const byOrdinal = $state<Record<number, SegmentAspects>>({});
	const requested = new Set<Aspect>();
	let sources: EventSource[] = [];

	function open(aspects: Aspect[]) {
		const fresh = aspects.filter((a) => !requested.has(a));
		if (fresh.length === 0) return;
		fresh.forEach((a) => requested.add(a));

		const es = new EventSource(`/api/analyze?doc=${docId}&aspects=${fresh.join(',')}`);
		sources.push(es);
		es.addEventListener('aspect', (e) => {
			const { ordinal, aspect, result } = JSON.parse((e as MessageEvent).data);
			byOrdinal[ordinal] = { ...(byOrdinal[ordinal] ?? {}), [aspect as Aspect]: result };
		});
		es.addEventListener('done', () => es.close());
		es.addEventListener('aspect_error', (e) => {
			console.warn('[analyze] aspect failed', (e as MessageEvent).data);
		});
	}

	open(MODE_ASPECTS[initialMode]);

	return {
		get: (ordinal: number): SegmentAspects => byOrdinal[ordinal] ?? {},
		requestMode: (mode: Mode) => open(MODE_ASPECTS[mode]),
		close: () => {
			sources.forEach((s) => s.close());
			sources = [];
		}
	};
}
```

- [ ] **Step 2: Wire it into the page**

In `src/routes/d/[docId]/+page.svelte`:
- Construct the state with the doc id + initial mode, request the new aspect bundle whenever `mode` changes, and close streams on destroy:
```ts
	import { onDestroy } from 'svelte';
	// ...
	const results = createResultsState(data.document.id, mode);
	$effect(() => {
		results.requestMode(mode);
	});
	onDestroy(() => results.close());
```
(Remove the Task 8 placeholder `createResultsState()` call; it now takes `docId` + `initialMode`.) `data.document.id` is available — add `id: documents.id` to the load's document select if not already present (it is, per Task 8 Step 1).

- [ ] **Step 3: Verify the type gate**

Run: `pnpm check`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 4: Manual end-to-end verification**

Start services + dev server and confirm the streaming flow:
```bash
pnpm services:up
pnpm dev
```
Then in the browser: submit `저는 학교에 갑니다. 고양이가 물을 마셔요.` from the home page with **Full** selected. Verify:
- redirect to `/d/<docId>?mode=full`; two segment cards appear immediately (text + unit badge).
- translation, pronunciation (full romaja + notes), breakdown (expandable canvas), and glossary fill in as they stream.
- switching to **Translate** shows only translation; switching back to **Full** shows the rest without a full reload (cached aspects appear instantly).
- a known sentence re-submitted renders its cached aspects near-instantly.
Record what you observed in the report (this task has no automated test).

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/results/results.state.svelte.ts src/routes/d/[docId]/+page.svelte
git commit -m "feat(results): live SSE streaming + mode switching with lazy upgrade"
```

---

## Self-Review

**Spec coverage (3a design §3–§8):**
- Home → document/segments → `/d/<docId>` redirect → Tasks 5, 6 ✓
- `/api/analyze` SSE (mode + lazy `aspects`, per-aspect events, concurrency, fail-soft) → Tasks 2, 3, 7 ✓
- `/d/<docId>` load + stacked segment cards + per-mode rendering + mode chips + lazy upgrade → Tasks 8, 9 ✓
- aspects→canvas adapter (no romaja, glossary re-keyed, phonetics out of canvas) → Task 4 ✓
- `Token.romanization` optional → Task 1 ✓
- Additive (legacy untouched) → Global Constraints + Task 6 note (`/canvas` left in place) ✓
- Testing: pure modules unit-tested (Tasks 1–5); SSE + UI manual (Task 9 Step 4) ✓

**Deferred (per design §1):** legacy removal / favorite-feedback rework (3b); history redesign (4); morpheme/grammarPattern canvas viz; per-token romaja.

**Placeholder scan:** none — exact paths, complete code, runnable commands. The two integration tasks (7, 8, 9) carry full code and are gated by `pnpm check` + the Task 9 manual verification.

**Type consistency:** `Aspect`/`Mode`/`MODE_ASPECTS` (Foundation) thread through `resolveAspectSet` (T3), the SSE endpoint (T7), the results store (T9), and `SegmentCard` (T8). `AspectResult` (sub-spec 2) is the value type in the store and `SegmentCard`. `composeParsedSentence` (T4) consumes the sub-spec-2 aspect types and produces the sub-spec-1 `ParsedSentence`. `buildDocumentInput` (T5) is used by the action (T6). The store factory signature changes from `createResultsState()` (T8 stub) to `createResultsState(docId, initialMode)` (T9) — T9 Step 2 updates the call site.

**Note:** Task 8 deliberately ships a store stub that Task 9 replaces; this keeps Task 8 independently `pnpm check`-clean while letting the streaming land as its own reviewable task.
