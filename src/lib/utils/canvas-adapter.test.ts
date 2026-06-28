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
