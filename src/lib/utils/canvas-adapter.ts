import type { ParsedSentence, Token, GlossaryEntry } from '$lib/schemas/sentence';
import type { StructureAspect, TranslationAspect, GlossaryAspect } from '$lib/schemas/aspects';

const NEUTRAL_GRAMMAR_NOTE = {
	structure: 'other' as const,
	explanation: '',
	formalityLevel: 'polite' as const
};

/**
 * Compose the per-aspect engine outputs into the legacy ParsedSentence shape the
 * TopologyCanvas consumes. Romanization is intentionally absent (it lives in the
 * pronunciation aspect / pronounce view). Glossary entries are re-keyed by
 * headword because token ids are not comparable across independent aspect calls.
 * Phonetic notes are not pushed through the canvas (rendered in the pronounce view).
 */
export function composeParsedSentence(input: {
	text: string;
	structure?: StructureAspect;
	translation?: TranslationAspect;
	glossary?: GlossaryAspect;
}): ParsedSentence {
	const tokens: Token[] = (input.structure?.tokens ?? []).map((t) => ({
		id: t.id,
		value: t.value,
		type: t.type,
		gloss: t.gloss,
		position: t.position,
		...(t.conjugation ? { conjugation: t.conjugation } : {})
	}));

	const glossary: GlossaryEntry[] = (input.glossary?.entries ?? []).map((e) => {
		const match = tokens.find((t) => t.value.includes(e.headword));
		return match ? { ...e, tokenId: match.id } : e;
	});

	return {
		originalText: input.text,
		translation: input.translation?.translation,
		tokens,
		particleBridges: input.structure?.particleBridges ?? [],
		phoneticNotes: [],
		grammarNote: input.structure?.grammarNote ?? NEUTRAL_GRAMMAR_NOTE,
		glossary
	};
}
