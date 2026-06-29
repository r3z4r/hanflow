import type { Aspect } from '$lib/schemas/analysis';
import { buildTranslationPrompt } from './translation';
import { buildStructurePrompt } from './structure';
import { buildPronunciationPrompt } from './pronunciation';
import { buildGlossaryPrompt } from './glossary';

const BUILDERS: Record<Aspect, (text: string) => { system: string; prompt: string }> = {
	translation: buildTranslationPrompt,
	structure: buildStructurePrompt,
	pronunciation: buildPronunciationPrompt,
	glossary: buildGlossaryPrompt
};

export function buildAspectPrompt(
	aspect: Aspect,
	text: string
): { system: string; prompt: string } {
	return BUILDERS[aspect](text);
}
