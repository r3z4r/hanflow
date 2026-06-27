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
