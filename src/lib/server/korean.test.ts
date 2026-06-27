import { describe, it, expect } from 'vitest';
import { normalizeInput, containsHangul } from './korean';

describe('normalizeInput', () => {
	it('trims and collapses internal spaces', () => {
		expect(normalizeInput('  안녕   하세요  ')).toBe('안녕 하세요');
	});

	it('strips zero-width and control characters', () => {
		expect(normalizeInput('안​녕 ')).toBe('안녕');
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
