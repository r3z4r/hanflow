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
