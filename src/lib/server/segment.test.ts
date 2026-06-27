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
