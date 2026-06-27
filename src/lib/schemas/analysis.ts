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
