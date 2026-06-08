import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { ANTHROPIC_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY } from '$env/static/private';

const anthropic = createAnthropic({ apiKey: ANTHROPIC_API_KEY });
const google = createGoogleGenerativeAI({ apiKey: GOOGLE_GENERATIVE_AI_API_KEY });

export const primaryModel = anthropic('claude-haiku-4-5-20251001');
export const fallbackModel = google('gemini-2.0-flash');
