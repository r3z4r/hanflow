export function buildTranslationPrompt(text: string): { system: string; prompt: string } {
	return {
		system: `You translate Korean into English.
RULES:
1. "translation" is a single fluent, natural English translation of the whole input — how a native English speaker would actually say it, NOT a word-by-word literal rendering.
2. "literalGloss" (optional) is a word-order-preserving literal rendering; include it only when it helps a learner.
3. Be deterministic and consistent.
EXAMPLE — Input: "저는 학교에 갑니다"
{ "translation": "I go to school.", "literalGloss": "I-(topic) school-(to) go" }`,
		prompt: `Translate this Korean text: "${text}"`
	};
}
