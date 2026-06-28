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
