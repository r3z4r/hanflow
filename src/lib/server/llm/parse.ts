import { generateObject } from 'ai';
import { primaryModel, fallbackModel } from './index';
import { ParsedSentenceSchema, type ParsedSentence } from '$lib/schemas/sentence';
import { buildSystemPrompt } from './prompt';
import type { Aspect } from '$lib/schemas/analysis';
import { ASPECT_SCHEMAS, type AspectResultMap, type AspectResult } from '$lib/schemas/aspects';
import { buildAspectPrompt } from './prompts';
import { tryWithFallback } from './fallback';

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

/**
 * Parse a single aspect of a segment. Selects the aspect's schema + prompt, runs
 * Anthropic (primary) → Gemini (fallback) per aspect via tryWithFallback. One
 * aspect failing does not affect others. Temperature stays 0.1 for cache stability.
 */
export function parseAspect<A extends Aspect>(aspect: A, text: string): Promise<AspectResultMap[A]>;
export async function parseAspect(aspect: Aspect, text: string): Promise<AspectResult> {
  const { system, prompt } = buildAspectPrompt(aspect, text);
  const schema = ASPECT_SCHEMAS[aspect];
  const run = (model: typeof primaryModel | typeof fallbackModel) =>
    generateObject({ model, schema, system, prompt, temperature: 0.1 }).then(
      (r) => r.object as AspectResult
    );
  return tryWithFallback(
    () => run(primaryModel),
    () => run(fallbackModel)
  );
}
