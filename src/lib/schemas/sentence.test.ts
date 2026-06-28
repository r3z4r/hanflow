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
