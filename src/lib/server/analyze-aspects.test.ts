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
