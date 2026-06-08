import { generateObject } from 'ai';
import { primaryModel, fallbackModel } from './index';
import { ParsedSentenceSchema, type ParsedSentence } from '$lib/schemas/sentence';
import { buildSystemPrompt } from './prompt';

export async function parseSentence(sentence: string): Promise<ParsedSentence> {
  const prompt = `Parse this Korean sentence: "${sentence}"`;
  const system = buildSystemPrompt();

  try {
    const { object } = await generateObject({
      model: primaryModel,
      schema: ParsedSentenceSchema,
      system,
      prompt,
      temperature: 0.1,
    });
    return object;
  } catch {
    const { object } = await generateObject({
      model: fallbackModel,
      schema: ParsedSentenceSchema,
      system,
      prompt,
      temperature: 0.1,
    });
    return object;
  }
}
