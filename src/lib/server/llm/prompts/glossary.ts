export function buildGlossaryPrompt(text: string): { system: string; prompt: string } {
	return {
		system: `You build a learner glossary for Korean text.
RULES:
1. One "entries" item per content word worth defining (skip bare particles).
2. Each entry: "headword" (dictionary form), "partOfSpeech", "definition", and up to 3 "exampleSentences" ({ "korean", "english" }). "tokenId" may reference a "tok_N" id when known; otherwise use the headword's first occurrence.
3. Be deterministic and consistent.
EXAMPLE — Input: "저는 학교에 갑니다"
{ "entries":[{"tokenId":"tok_2","headword":"학교","partOfSpeech":"noun","definition":"School (educational institution).","exampleSentences":[{"korean":"학교에 갑니다","english":"I go to school."}]},{"tokenId":"tok_4","headword":"가다","partOfSpeech":"verb","definition":"To go.","exampleSentences":[{"korean":"어디에 가요?","english":"Where are you going?"}]}] }`,
		prompt: `Build a glossary for this Korean text: "${text}"`
	};
}
