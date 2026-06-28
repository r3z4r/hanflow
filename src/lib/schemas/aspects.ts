import { z } from 'zod';
import {
	TokenTypeSchema,
	ParticleBridgeSchema,
	GrammarNoteSchema,
	ConjugationChainSchema,
	GlossaryEntrySchema,
	PhoneticPhenomenonSchema
} from './sentence';
import type { Aspect } from './analysis';

// ── translation ───────────────────────────────────────────────
export const TranslationAspectSchema = z.object({
	translation: z.string(),
	literalGloss: z.string().optional()
});
export type TranslationAspect = z.infer<typeof TranslationAspectSchema>;

// ── structure (no romanization — that lives in pronunciation) ──
export const MorphemeRoleSchema = z.enum(['stem', 'infix', 'ending', 'particle', 'suffix']);

export const MorphemeSchema = z.object({
	surface: z.string(),
	dictionaryForm: z.string().optional(),
	role: MorphemeRoleSchema,
	meaning: z.string()
});
export type Morpheme = z.infer<typeof MorphemeSchema>;

export const StructureTokenSchema = z.object({
	id: z.string(),
	value: z.string(),
	type: TokenTypeSchema,
	gloss: z.string(),
	position: z.number().int().nonnegative(),
	morphemes: z.array(MorphemeSchema).optional(),
	conjugation: ConjugationChainSchema.optional()
});
export type StructureToken = z.infer<typeof StructureTokenSchema>;

export const GrammarPatternSchema = z.object({
	pattern: z.string(),
	meaning: z.string(),
	tokenIds: z.array(z.string())
});
export type GrammarPattern = z.infer<typeof GrammarPatternSchema>;

export const StructureAspectSchema = z.object({
	tokens: z.array(StructureTokenSchema),
	particleBridges: z.array(ParticleBridgeSchema),
	grammarNote: GrammarNoteSchema,
	grammarPatterns: z.array(GrammarPatternSchema)
});
export type StructureAspect = z.infer<typeof StructureAspectSchema>;

// ── pronunciation (self-contained; surface refs, not token ids) ─
export const AspectPhoneticNoteSchema = z.object({
	phenomenon: PhoneticPhenomenonSchema,
	description: z.string(),
	surface: z.string().optional()
});
export type AspectPhoneticNote = z.infer<typeof AspectPhoneticNoteSchema>;

export const PronunciationAspectSchema = z.object({
	fullRomanization: z.string(),
	phoneticNotes: z.array(AspectPhoneticNoteSchema)
});
export type PronunciationAspect = z.infer<typeof PronunciationAspectSchema>;

// ── glossary ──────────────────────────────────────────────────
export const GlossaryAspectSchema = z.object({
	entries: z.array(GlossaryEntrySchema)
});
export type GlossaryAspect = z.infer<typeof GlossaryAspectSchema>;

// ── aspect → schema map + result types ────────────────────────
export const ASPECT_SCHEMAS = {
	translation: TranslationAspectSchema,
	structure: StructureAspectSchema,
	pronunciation: PronunciationAspectSchema,
	glossary: GlossaryAspectSchema
} satisfies Record<Aspect, z.ZodType>;

export type AspectResultMap = {
	translation: TranslationAspect;
	structure: StructureAspect;
	pronunciation: PronunciationAspect;
	glossary: GlossaryAspect;
};
export type AspectResult = AspectResultMap[Aspect];
