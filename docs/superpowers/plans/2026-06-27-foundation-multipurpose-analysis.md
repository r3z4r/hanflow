# Foundation (Sub-spec 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the additive, non-breaking foundation for the multi-purpose analysis redesign: a Vitest test runner, shared analysis types (aspects/modes/unit types), input sanitization + segmentation, hashing + cache-key helpers, and the `documents` / `segments` / `segment_aspects` database tables with a migration.

**Architecture:** Pure, deterministic logic modules (sanitize, segment, hash, cache-key) developed test-first with Vitest; shared zod enums in `src/lib/schemas/analysis.ts`; new Drizzle tables added alongside the existing `sentence_history` (which is left untouched so the current parse→canvas flow keeps working). No routes, prompts, or the LLM pipeline are modified in this sub-spec.

**Tech Stack:** SvelteKit 2 + Svelte 5, TypeScript, Zod 4, Drizzle ORM (PostgreSQL), ioredis, Vitest.

## Global Constraints

- **Verification gate:** `pnpm check` must report `0 errors, 0 warnings` before any task is "done" (in addition to that task's Vitest run).
- **Indentation:** new server/schema/util `.ts` files use **tabs** (match `schema.ts`, `redis.ts`, `korean.ts`).
- **Additive & non-breaking:** do NOT modify `sentence_history`, `parse_feedback`, `src/routes/+page.server.ts`, `src/lib/server/llm/*`, or `isHangulOnly` in this sub-spec. New code lives beside the old.
- **Validate at boundaries:** runtime data shapes are zod-validated; enum-like DB columns (`default_mode`, `unit_type`, `aspect`) are stored as `text` and validated in the app layer via the schemas in `analysis.ts`.
- **Sanitize, don't restrict:** the eventual input gate is "contains ≥1 Hangul char", not "Hangul only". This sub-spec only builds the helpers; wiring them into the route is Sub-spec 3.
- **Segment cap:** `MAX_SEGMENTS = 50`; over-limit input is reported (`truncated: true`, `totalUnits`), never silently dropped.
- **Test files:** colocated as `*.test.ts` next to the module under test; Vitest runs in the `node` environment.

## File Structure

| File | Responsibility |
|---|---|
| `vite.config.ts` (modify) | Add Vitest `test` block (reuses the SvelteKit plugin for `$lib` resolution) |
| `package.json` (modify) | Add `vitest` dev dependency + `test` / `test:watch` scripts |
| `src/lib/schemas/analysis.ts` (create) | `AspectSchema`, `UnitTypeSchema`, `ModeSchema`, `MODE_ASPECTS` — shared contract |
| `src/lib/server/korean.ts` (modify) | Add `normalizeInput`, `containsHangul` (keep `isHangulOnly`) |
| `src/lib/server/segment.ts` (create) | `segment()` → ordered units with `unitType` + cap/truncation info |
| `src/lib/utils/hash.ts` (modify) | Add generic `hashText`; keep `hashSentence` as alias |
| `src/lib/server/cache-keys.ts` (create) | `segmentAspectKey(segHash, aspect)` — Redis key builder (no `$env` import) |
| `src/lib/server/db/schema.ts` (modify) | `documents`, `segments`, `segmentAspects` tables + relations |
| `drizzle/migrations/*` (generated) | Additive migration creating the three tables |

> Cache-key building lives in its own `cache-keys.ts` (not `redis.ts`) deliberately: `redis.ts` imports `$env/static/private`, which would force Vitest to resolve SvelteKit's env virtual module. Keeping the pure key builder env-free keeps its test trivial.

---

### Task 1: Vitest test runner

**Files:**
- Modify: `package.json` (devDependencies + scripts)
- Modify: `vite.config.ts`
- Create: `src/lib/server/_smoke.test.ts` (temporary; removed in Task 2)

**Interfaces:**
- Consumes: nothing
- Produces: a working `pnpm test` command and `*.test.ts` discovery under `src/`

- [ ] **Step 1: Install Vitest**

Run:
```bash
pnpm add -D vitest
```
Expected: `vitest` appears under `devDependencies` in `package.json`.

- [ ] **Step 2: Add test scripts to `package.json`**

In the `"scripts"` block, add these two entries after the `"check:watch"` line:
```json
		"test": "vitest run",
		"test:watch": "vitest",
```

- [ ] **Step 3: Add the Vitest config to `vite.config.ts`**

Replace the entire file with:
```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node'
	}
});
```
(`defineConfig` is imported from `vitest/config` so the `test` field is typed; it still wraps Vite, so dev/build are unaffected.)

- [ ] **Step 4: Add a smoke test**

Create `src/lib/server/_smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('vitest smoke', () => {
	it('runs arithmetic', () => {
		expect(1 + 1).toBe(2);
	});
});
```

- [ ] **Step 5: Run the smoke test**

Run:
```bash
pnpm test
```
Expected: PASS — 1 test file, 1 passing test.

- [ ] **Step 6: Verify the type gate still passes**

Run:
```bash
pnpm check
```
Expected: `0 errors, 0 warnings`.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml vite.config.ts src/lib/server/_smoke.test.ts
git commit -m "chore(test): add vitest runner"
```

---

### Task 2: Shared analysis types

**Files:**
- Create: `src/lib/schemas/analysis.ts`
- Create: `src/lib/schemas/analysis.test.ts`
- Delete: `src/lib/server/_smoke.test.ts`

**Interfaces:**
- Consumes: `zod`
- Produces:
  - `AspectSchema` / `Aspect` = `'translation' | 'structure' | 'pronunciation' | 'glossary'`
  - `UnitTypeSchema` / `UnitType` = `'word' | 'sentence' | 'fragment'`
  - `ModeSchema` / `Mode` = `'translate' | 'breakdown' | 'pronounce' | 'full'`
  - `MODE_ASPECTS: Record<Mode, Aspect[]>`

- [ ] **Step 1: Remove the smoke test**

```bash
git rm src/lib/server/_smoke.test.ts
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/schemas/analysis.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import {
	AspectSchema,
	UnitTypeSchema,
	ModeSchema,
	MODE_ASPECTS,
	type Mode
} from './analysis';

describe('analysis enums', () => {
	it('accepts valid aspects and rejects unknown', () => {
		expect(AspectSchema.parse('glossary')).toBe('glossary');
		expect(AspectSchema.safeParse('bogus').success).toBe(false);
	});

	it('accepts valid unit types and modes', () => {
		expect(UnitTypeSchema.parse('fragment')).toBe('fragment');
		expect(ModeSchema.parse('breakdown')).toBe('breakdown');
	});
});

describe('MODE_ASPECTS', () => {
	it('maps every mode to its aspect bundle', () => {
		expect(MODE_ASPECTS.translate).toEqual(['translation']);
		expect(MODE_ASPECTS.breakdown).toEqual(['structure', 'translation']);
		expect(MODE_ASPECTS.pronounce).toEqual(['pronunciation', 'translation']);
		expect(MODE_ASPECTS.full).toEqual([
			'translation',
			'structure',
			'pronunciation',
			'glossary'
		]);
	});

	it('every mode bundle is non-empty and uses valid aspects', () => {
		for (const mode of Object.keys(MODE_ASPECTS) as Mode[]) {
			const aspects = MODE_ASPECTS[mode];
			expect(aspects.length).toBeGreaterThan(0);
			for (const a of aspects) expect(AspectSchema.safeParse(a).success).toBe(true);
		}
	});
});
```

- [ ] **Step 3: Run it to confirm it fails**

Run:
```bash
pnpm exec vitest run src/lib/schemas/analysis.test.ts
```
Expected: FAIL — cannot resolve `./analysis`.

- [ ] **Step 4: Implement the module**

Create `src/lib/schemas/analysis.ts`:
```ts
import { z } from 'zod';

export const AspectSchema = z.enum(['translation', 'structure', 'pronunciation', 'glossary']);
export type Aspect = z.infer<typeof AspectSchema>;

export const UnitTypeSchema = z.enum(['word', 'sentence', 'fragment']);
export type UnitType = z.infer<typeof UnitTypeSchema>;

export const ModeSchema = z.enum(['translate', 'breakdown', 'pronounce', 'full']);
export type Mode = z.infer<typeof ModeSchema>;

// A mode is a bundle of aspects. Switching mode later fetches only the aspects
// not already cached for a segment (lazy upgrade).
export const MODE_ASPECTS: Record<Mode, Aspect[]> = {
	translate: ['translation'],
	breakdown: ['structure', 'translation'],
	pronounce: ['pronunciation', 'translation'],
	full: ['translation', 'structure', 'pronunciation', 'glossary']
};
```

- [ ] **Step 5: Run the test to confirm it passes**

Run:
```bash
pnpm exec vitest run src/lib/schemas/analysis.test.ts
```
Expected: PASS.

- [ ] **Step 6: Verify the type gate**

Run: `pnpm check`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/schemas/analysis.ts src/lib/schemas/analysis.test.ts
git commit -m "feat(analysis): add aspect/mode/unit-type contract"
```

---

### Task 3: `normalizeInput`

**Files:**
- Modify: `src/lib/server/korean.ts`
- Create: `src/lib/server/korean.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `normalizeInput(raw: string): string` — NFC; strips control + zero-width chars; full-width ASCII → half-width; ideographic space → normal space; collapses runs of spaces/tabs; tidies whitespace around newlines; trims.

- [ ] **Step 1: Write the failing test**

Create `src/lib/server/korean.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { normalizeInput } from './korean';

describe('normalizeInput', () => {
	it('trims and collapses internal spaces', () => {
		expect(normalizeInput('  안녕   하세요  ')).toBe('안녕 하세요');
	});

	it('strips zero-width and control characters', () => {
		expect(normalizeInput('안​녕 ')).toBe('안녕');
	});

	it('converts full-width ASCII to half-width', () => {
		expect(normalizeInput('ＡＢＣ１２３')).toBe('ABC123');
	});

	it('normalizes the ideographic space to a normal space', () => {
		expect(normalizeInput('안녕　하세요')).toBe('안녕 하세요');
	});

	it('tidies whitespace around newlines but keeps the newline', () => {
		expect(normalizeInput('첫째 줄  \n   둘째 줄')).toBe('첫째 줄\n둘째 줄');
	});

	it('returns empty string for whitespace-only input', () => {
		expect(normalizeInput('   \n  ')).toBe('');
	});
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run:
```bash
pnpm exec vitest run src/lib/server/korean.test.ts
```
Expected: FAIL — `normalizeInput` is not exported.

- [ ] **Step 3: Implement `normalizeInput`**

Append to `src/lib/server/korean.ts` (keep the existing `HANGUL_RE` and `isHangulOnly`):
```ts
/**
 * Normalize raw user input for analysis. Never throws. Fixes the common ways
 * pasted text is "dirty" without rejecting it: NFC composition, control/zero-width
 * removal, full-width→half-width ASCII, whitespace tidy. Newlines are preserved as
 * segment boundaries.
 */
export function normalizeInput(raw: string): string {
	return raw
		.normalize('NFC')
		.replace(/[ -​-‍﻿]/g, '') // control + zero-width
		.replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0)) // full-width ASCII
		.replace(/　/g, ' ') // ideographic space
		.replace(/[ \t]+/g, ' ')
		.replace(/[ \t]*\n[ \t]*/g, '\n') // tidy around newlines, keep the break
		.replace(/\n{2,}/g, '\n')
		.trim();
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run:
```bash
pnpm exec vitest run src/lib/server/korean.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/korean.ts src/lib/server/korean.test.ts
git commit -m "feat(korean): add normalizeInput sanitizer"
```

---

### Task 4: `containsHangul`

**Files:**
- Modify: `src/lib/server/korean.ts`
- Modify: `src/lib/server/korean.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `containsHangul(text: string): boolean` — true if the text contains ≥1 Hangul syllable (가–힣) or jamo (ㄱ–ㆎ).

- [ ] **Step 1: Add the failing test**

Append to `src/lib/server/korean.test.ts`:
```ts
import { containsHangul } from './korean';

describe('containsHangul', () => {
	it('is true for pure Korean', () => {
		expect(containsHangul('안녕하세요')).toBe(true);
	});

	it('is true for mixed Korean + Latin + digits', () => {
		expect(containsHangul('K-pop 좋아요 2025')).toBe(true);
	});

	it('is true for standalone jamo', () => {
		expect(containsHangul('ㅋㅋ')).toBe(true);
	});

	it('is false for pure non-Korean', () => {
		expect(containsHangul('hello world 123')).toBe(false);
	});

	it('is false for empty input', () => {
		expect(containsHangul('')).toBe(false);
	});
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run:
```bash
pnpm exec vitest run src/lib/server/korean.test.ts
```
Expected: FAIL — `containsHangul` is not exported.

- [ ] **Step 3: Implement `containsHangul`**

Append to `src/lib/server/korean.ts`:
```ts
const HAS_HANGUL_RE = /[가-힣ㄱ-ㆎ]/u;

/**
 * The input gate for analysis: accept anything containing at least some Hangul.
 * Mixed/messy text passes; pure non-Korean is handled with a soft hint upstream
 * (not a hard rejection styled as an error).
 */
export function containsHangul(text: string): boolean {
	return HAS_HANGUL_RE.test(text);
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run:
```bash
pnpm exec vitest run src/lib/server/korean.test.ts
```
Expected: PASS (all `normalizeInput` + `containsHangul` tests).

- [ ] **Step 5: Verify the type gate**

Run: `pnpm check`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/korean.ts src/lib/server/korean.test.ts
git commit -m "feat(korean): add containsHangul gate"
```

---

### Task 5: `segment`

**Files:**
- Create: `src/lib/server/segment.ts`
- Create: `src/lib/server/segment.test.ts`

**Interfaces:**
- Consumes: `UnitType` from `src/lib/schemas/analysis.ts`
- Produces:
  - `MAX_SEGMENTS: number` (= 50)
  - `interface Segment { text: string; unitType: UnitType; ordinal: number }`
  - `interface SegmentResult { segments: Segment[]; totalUnits: number; truncated: boolean }`
  - `segment(normalized: string): SegmentResult` — splits normalized text into ordered units, classifies each, caps at `MAX_SEGMENTS`. Fail-soft: unsplittable non-empty input becomes a single `fragment`; empty input yields no segments.

- [ ] **Step 1: Write the failing test**

Create `src/lib/server/segment.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { segment, MAX_SEGMENTS } from './segment';

describe('segment classification', () => {
	it('classifies a single eojeol as a word', () => {
		const r = segment('막혔을');
		expect(r.segments).toEqual([{ text: '막혔을', unitType: 'word', ordinal: 0 }]);
	});

	it('classifies a punctuation-terminated clause as a sentence', () => {
		const r = segment('그는 포기했다.');
		expect(r.segments[0]).toEqual({ text: '그는 포기했다.', unitType: 'sentence', ordinal: 0 });
	});

	it('classifies a polite ending without punctuation as a sentence', () => {
		const r = segment('고양이가 물을 마셔요');
		expect(r.segments[0].unitType).toBe('sentence');
	});

	it('classifies a multi-word phrase with no terminal ending as a fragment', () => {
		const r = segment('물리적으로 막혔을 때');
		expect(r.segments[0].unitType).toBe('fragment');
	});
});

describe('segment splitting', () => {
	it('splits a paragraph into sentences with sequential ordinals', () => {
		const r = segment('저는 학교에 갑니다. 고양이가 물을 마셔요.');
		expect(r.segments.map((s) => s.ordinal)).toEqual([0, 1]);
		expect(r.segments.map((s) => s.unitType)).toEqual(['sentence', 'sentence']);
		expect(r.totalUnits).toBe(2);
		expect(r.truncated).toBe(false);
	});

	it('splits on newlines', () => {
		const r = segment('첫째 문장입니다.\n둘째 문장입니다.');
		expect(r.segments).toHaveLength(2);
	});
});

describe('segment edge cases', () => {
	it('returns no segments for empty input', () => {
		expect(segment('')).toEqual({ segments: [], totalUnits: 0, truncated: false });
	});

	it('falls back to a single fragment when it cannot split', () => {
		const r = segment('막혔을 때 그리고');
		expect(r.segments).toHaveLength(1);
		expect(r.segments[0].unitType).toBe('fragment');
	});

	it('caps at MAX_SEGMENTS and reports truncation', () => {
		const many = Array.from({ length: MAX_SEGMENTS + 10 }, (_, i) => `문장 번호 ${i}입니다.`).join(
			' '
		);
		const r = segment(many);
		expect(r.segments).toHaveLength(MAX_SEGMENTS);
		expect(r.totalUnits).toBe(MAX_SEGMENTS + 10);
		expect(r.truncated).toBe(true);
		expect(r.segments.at(-1)?.ordinal).toBe(MAX_SEGMENTS - 1);
	});
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run:
```bash
pnpm exec vitest run src/lib/server/segment.test.ts
```
Expected: FAIL — cannot resolve `./segment`.

- [ ] **Step 3: Implement `segment`**

Create `src/lib/server/segment.ts`:
```ts
import type { UnitType } from '$lib/schemas/analysis';

export const MAX_SEGMENTS = 50;

export interface Segment {
	text: string;
	unitType: UnitType;
	ordinal: number;
}

export interface SegmentResult {
	segments: Segment[];
	totalUnits: number;
	truncated: boolean;
}

const SENTENCE_FINAL = /[.!?…。]$/;
// Common declarative/polite/interrogative final syllables, used only when there
// is no terminal punctuation to lean on.
const KOREAN_ENDERS = /(다|요|까|죠)$/;

function classify(unit: string): UnitType {
	if (!/\s/.test(unit)) return 'word';
	const withoutFinalPunct = unit.replace(/[.!?…。]+$/, '');
	if (SENTENCE_FINAL.test(unit) || KOREAN_ENDERS.test(withoutFinalPunct)) return 'sentence';
	return 'fragment';
}

/**
 * Split already-normalized text into ordered analysis units. Deterministic and
 * fail-soft: it never throws and never returns zero segments for non-empty input.
 * `truncated`/`totalUnits` let the UI show an "analyzed first N of M" notice.
 */
export function segment(normalized: string): SegmentResult {
	const text = normalized.trim();
	if (!text) return { segments: [], totalUnits: 0, truncated: false };

	const units = text
		.split(/\n+/)
		.flatMap((line) => line.split(/(?<=[.!?…。])\s+/))
		.map((u) => u.trim())
		.filter(Boolean);

	// Guard: if splitting somehow produced nothing, treat the whole input as one unit.
	const safeUnits = units.length > 0 ? units : [text];

	const totalUnits = safeUnits.length;
	const kept = safeUnits.slice(0, MAX_SEGMENTS);

	return {
		segments: kept.map((u, i) => ({ text: u, unitType: classify(u), ordinal: i })),
		totalUnits,
		truncated: totalUnits > MAX_SEGMENTS
	};
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run:
```bash
pnpm exec vitest run src/lib/server/segment.test.ts
```
Expected: PASS.

- [ ] **Step 5: Verify the type gate**

Run: `pnpm check`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/segment.ts src/lib/server/segment.test.ts
git commit -m "feat(segment): add sanitizer-aware sentence segmentation"
```

---

### Task 6: Hashing + cache-key helpers

**Files:**
- Modify: `src/lib/utils/hash.ts`
- Create: `src/lib/utils/hash.test.ts`
- Create: `src/lib/server/cache-keys.ts`
- Create: `src/lib/server/cache-keys.test.ts`

**Interfaces:**
- Consumes: `Aspect` from `src/lib/schemas/analysis.ts`
- Produces:
  - `hashText(text: string): Promise<string>` — SHA-256 hex of the trimmed, NFC-normalized text
  - `hashSentence` — retained alias of `hashText` (existing call sites keep working)
  - `segmentAspectKey(segHash: string, aspect: Aspect): string` → `hanflow:seg:<segHash>:<aspect>`

- [ ] **Step 1: Write the failing hash test**

Create `src/lib/utils/hash.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { hashText, hashSentence } from './hash';

describe('hashText', () => {
	it('produces a 64-char hex SHA-256', async () => {
		const h = await hashText('안녕하세요');
		expect(h).toMatch(/^[0-9a-f]{64}$/);
	});

	it('is stable across trim and NFC differences', async () => {
		expect(await hashText('  안녕  ')).toBe(await hashText('안녕'));
	});

	it('differs for different inputs', async () => {
		expect(await hashText('안녕')).not.toBe(await hashText('안녕히'));
	});

	it('hashSentence is the same function as hashText', async () => {
		expect(await hashSentence('테스트')).toBe(await hashText('테스트'));
	});
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run:
```bash
pnpm exec vitest run src/lib/utils/hash.test.ts
```
Expected: FAIL — `hashText` is not exported.

- [ ] **Step 3: Refactor `hash.ts`**

Replace the entire `src/lib/utils/hash.ts` with:
```ts
/**
 * SHA-256 hex of the trimmed, NFC-normalized text. Basis of every cache key
 * (document hash, segment hash) so identical text always maps to one entry.
 */
export async function hashText(text: string): Promise<string> {
	const normalized = text.trim().normalize('NFC');
	const encoded = new TextEncoder().encode(normalized);
	const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
	return Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

/** Back-compat alias for existing call sites. */
export const hashSentence = hashText;
```

- [ ] **Step 4: Run the hash test to confirm it passes**

Run:
```bash
pnpm exec vitest run src/lib/utils/hash.test.ts
```
Expected: PASS.

- [ ] **Step 5: Write the failing cache-key test**

Create `src/lib/server/cache-keys.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { segmentAspectKey } from './cache-keys';

describe('segmentAspectKey', () => {
	it('builds the namespaced redis key', () => {
		expect(segmentAspectKey('abc123', 'translation')).toBe('hanflow:seg:abc123:translation');
	});

	it('varies by aspect', () => {
		expect(segmentAspectKey('abc123', 'glossary')).toBe('hanflow:seg:abc123:glossary');
	});
});
```

- [ ] **Step 6: Run it to confirm it fails**

Run:
```bash
pnpm exec vitest run src/lib/server/cache-keys.test.ts
```
Expected: FAIL — cannot resolve `./cache-keys`.

- [ ] **Step 7: Implement `cache-keys.ts`**

Create `src/lib/server/cache-keys.ts`:
```ts
import type { Aspect } from '$lib/schemas/analysis';

/**
 * Redis key for one cached aspect of one segment. Keyed by segment hash (not
 * document) so the same sentence reuses its cached aspects across documents.
 * 7-day TTL is applied by the writer (Sub-spec 2), not here.
 */
export function segmentAspectKey(segHash: string, aspect: Aspect): string {
	return `hanflow:seg:${segHash}:${aspect}`;
}
```

- [ ] **Step 8: Run the cache-key test to confirm it passes**

Run:
```bash
pnpm exec vitest run src/lib/server/cache-keys.test.ts
```
Expected: PASS.

- [ ] **Step 9: Verify the type gate**

Run: `pnpm check`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 10: Commit**

```bash
git add src/lib/utils/hash.ts src/lib/utils/hash.test.ts src/lib/server/cache-keys.ts src/lib/server/cache-keys.test.ts
git commit -m "feat(cache): add hashText and segment-aspect key builder"
```

---

### Task 7: Database tables (`documents`, `segments`, `segment_aspects`)

**Files:**
- Modify: `src/lib/server/db/schema.ts`

**Interfaces:**
- Consumes: existing `users` table, existing drizzle imports (`pgTable`, `text`, `timestamp`, `integer`, `jsonb`, `uuid`, `boolean`, `index`, `primaryKey`, `relations`)
- Produces: `documents`, `segments`, `segmentAspects` table objects + relations. `sentence_history` and `parse_feedback` are untouched.

- [ ] **Step 1: Add the three tables**

In `src/lib/server/db/schema.ts`, after the `parseFeedback` table definition (before the `// ── Relations ──` section), add:
```ts
export const documents = pgTable(
	'document',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
		docHash: text('doc_hash').notNull(),
		rawInput: text('raw_input').notNull(),
		normalizedInput: text('normalized_input').notNull(),
		defaultMode: text('default_mode').notNull(),
		isFavorited: boolean('is_favorited').default(false).notNull(),
		createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull()
	},
	(table) => [
		index('document_user_id_idx').on(table.userId),
		index('document_hash_idx').on(table.docHash)
	]
);

export const segments = pgTable(
	'segment',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		documentId: uuid('document_id')
			.notNull()
			.references(() => documents.id, { onDelete: 'cascade' }),
		segHash: text('seg_hash').notNull(),
		segmentText: text('segment_text').notNull(),
		unitType: text('unit_type').notNull(),
		ordinal: integer('ordinal').notNull(),
		isFavorited: boolean('is_favorited').default(false).notNull()
	},
	(table) => [
		index('segment_document_ordinal_idx').on(table.documentId, table.ordinal),
		index('segment_hash_idx').on(table.segHash)
	]
);

// Persistent (cold) per-aspect parse cache, keyed by segment hash + aspect so it
// is reused across documents. Redis is the hot mirror.
export const segmentAspects = pgTable(
	'segment_aspect',
	{
		segHash: text('seg_hash').notNull(),
		aspect: text('aspect').notNull(),
		result: jsonb('result').notNull(),
		model: text('model'),
		createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull()
	},
	(table) => [primaryKey({ columns: [table.segHash, table.aspect] })]
);
```

- [ ] **Step 2: Add relations**

In the `// ── Relations ──` section, add `documents: many(documents)` to `usersRelations`, then append the two new relation blocks. Replace `usersRelations` with:
```ts
export const usersRelations = relations(users, ({ many }) => ({
	accounts: many(accounts),
	sessions: many(sessions),
	sentenceHistory: many(sentenceHistory),
	parseFeedback: many(parseFeedback),
	documents: many(documents)
}));
```
Then append at the end of the file:
```ts
export const documentsRelations = relations(documents, ({ one, many }) => ({
	user: one(users, { fields: [documents.userId], references: [users.id] }),
	segments: many(segments)
}));

export const segmentsRelations = relations(segments, ({ one }) => ({
	document: one(documents, { fields: [segments.documentId], references: [documents.id] })
}));
```

- [ ] **Step 3: Verify the type gate**

Run: `pnpm check`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/db/schema.ts
git commit -m "feat(db): add documents/segments/segment_aspects tables"
```

---

### Task 8: Generate and apply the migration

**Files:**
- Generated: `drizzle/migrations/*` (new SQL + journal/snapshot updates)

**Interfaces:**
- Consumes: the schema from Task 7
- Produces: a committed, applied additive migration creating the three new tables

- [ ] **Step 1: Generate the migration**

Run:
```bash
pnpm db:generate
```
Expected: a new `drizzle/migrations/NNNN_*.sql` file is created.

- [ ] **Step 2: Inspect the generated SQL**

Open the new `drizzle/migrations/NNNN_*.sql` and confirm it ONLY contains `CREATE TABLE "document"`, `CREATE TABLE "segment"`, `CREATE TABLE "segment_aspect"`, their indexes, and the foreign keys. It must contain **no** `ALTER`/`DROP` against `sentence_history`, `parse_feedback`, or any auth table.
Expected: additive-only DDL. If any `DROP`/`ALTER` of existing tables appears, stop and re-check Task 7 (do not apply).

- [ ] **Step 3: Start local services**

Run:
```bash
pnpm services:up
```
Expected: Postgres and Redis containers are up.

- [ ] **Step 4: Apply the migration**

Run:
```bash
pnpm db:migrate
```
Expected: migration applies with no error.

- [ ] **Step 5: Verify the tables exist**

Run:
```bash
docker compose exec -T postgres psql -U postgres -d hanflow -c "\dt" 2>/dev/null || echo "adjust psql creds/db name to match docker-compose.yml, then re-run"
```
Expected: `document`, `segment`, and `segment_aspect` appear in the table list. (If the credentials/db name differ, read `docker-compose.yml` and adjust the `-U`/`-d` flags.)

- [ ] **Step 6: Verify the type gate**

Run: `pnpm check`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 7: Commit**

```bash
git add drizzle/migrations
git commit -m "feat(db): migration for documents/segments/segment_aspects"
```

---

## Self-Review

**Spec coverage (Sub-spec 1 scope from the umbrella §10):**
- `documents`/`segments`/`segment_aspects` schema + migration → Tasks 7, 8 ✓
- `normalizeInput`/`containsHangul`/`segment` → Tasks 3, 4, 5 ✓
- Redis key scheme → Task 6 (`segmentAspectKey`) ✓
- Shared aspect/mode/unit-type contract (needed by key builder + downstream) → Task 2 ✓
- Hashing for doc/segment hashes → Task 6 (`hashText`) ✓
- Test runner enabling TDD (locked decision) → Task 1 ✓
- "Old flow keeps working" → guaranteed by the additive-only constraint + Task 8 Step 2 check ✓

**Deferred to later sub-specs (intentionally NOT in this plan):**
- Per-aspect zod schemas + prompts, morphology/`grammarPatterns`, aspect read-through cache helper → Sub-spec 2.
- `/api/analyze` SSE, `/d/<id>` route, mode chips, canvas adapter → Sub-spec 3.
- History search/filter/date-grouping, both-level favoriting → Sub-spec 4.
- `parse_feedback` re-key to `segHash` and the `sentence_history` → `documents` backfill → done with Sub-spec 2 (needs the aspect schemas to split `parsed_result`).

**Placeholder scan:** none — every step has exact paths, complete code, and runnable commands with expected output.

**Type consistency:** `Aspect`/`UnitType`/`Mode` defined in Task 2 are the exact names consumed in Tasks 5 (`UnitType`) and 6 (`Aspect`); `hashText`/`hashSentence` names match across Task 6 definition and its alias; table/relation names in Task 7 match the migration in Task 8.

**Open items carried from the spec (not blocking this sub-spec):** `MAX_SEGMENTS` value (set to 50 here) and over-limit copy (UI, Sub-spec 3); whether `grammarPatterns` needs a curated reference list (Sub-spec 2); whether `defaultMode` is remembered per user (Sub-spec 3/4).
