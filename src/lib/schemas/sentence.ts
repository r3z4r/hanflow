import { z } from 'zod';

export const TokenTypeSchema = z.enum([
  'noun', 'pronoun', 'particle', 'verb', 'adjective',
  'adverb', 'conjunction', 'interjection', 'determiner',
  'suffix', 'ending', 'unknown'
]);
export type TokenType = z.infer<typeof TokenTypeSchema>;

export const ConjugationStepSchema = z.object({
  label: z.string(),
  form: z.string(),
  note: z.string().optional(),
});
export type ConjugationStep = z.infer<typeof ConjugationStepSchema>;

export const ConjugationChainSchema = z.object({
  dictionaryForm: z.string(),
  stem: z.string(),
  infix: z.string().optional(),
  politeSuffix: z.string(),
  politeForm: z.string(),
  steps: z.array(ConjugationStepSchema),
});
export type ConjugationChain = z.infer<typeof ConjugationChainSchema>;

export const TokenSchema = z.object({
  id: z.string(),             // e.g. "tok_0"
  value: z.string(),          // surface Hangul
  type: TokenTypeSchema,
  romanization: z.string(),   // Revised Romanization
  gloss: z.string(),          // English gloss
  position: z.number().int().nonnegative(),
  conjugation: ConjugationChainSchema.optional(),
});
export type Token = z.infer<typeof TokenSchema>;

export const ParticleBridgeSchema = z.object({
  particleTokenId: z.string(),
  nounTokenId: z.string(),
  relationLabel: z.string(),
});
export type ParticleBridge = z.infer<typeof ParticleBridgeSchema>;

export const PhoneticPhenomenonSchema = z.enum([
  'batchim_assimilation', 'liaison', 'nasalization',
  'aspiration', 'tensification', 'other'
]);

export const PhoneticNoteSchema = z.object({
  phenomenon: PhoneticPhenomenonSchema,
  description: z.string(),
  tokenIds: z.array(z.string()),
});
export type PhoneticNote = z.infer<typeof PhoneticNoteSchema>;

export const GrammarNoteSchema = z.object({
  structure: z.enum(['SOV', 'SVO', 'OSV', 'topicComment', 'other']),
  explanation: z.string(),
  formalityLevel: z.enum(['formal', 'polite', 'informal', 'banmal']),
});
export type GrammarNote = z.infer<typeof GrammarNoteSchema>;

export const GlossaryEntrySchema = z.object({
  tokenId: z.string(),
  headword: z.string(),
  partOfSpeech: z.string(),
  definition: z.string(),
  exampleSentences: z.array(
    z.object({ korean: z.string(), english: z.string() })
  ).max(3),
});
export type GlossaryEntry = z.infer<typeof GlossaryEntrySchema>;

export const ParsedSentenceSchema = z.object({
  originalText: z.string(),
  translation: z.string().optional(), // natural full-sentence English translation
  tokens: z.array(TokenSchema),
  particleBridges: z.array(ParticleBridgeSchema),
  phoneticNotes: z.array(PhoneticNoteSchema),
  grammarNote: GrammarNoteSchema,
  glossary: z.array(GlossaryEntrySchema),
});
export type ParsedSentence = z.infer<typeof ParsedSentenceSchema>;
