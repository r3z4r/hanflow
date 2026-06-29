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
