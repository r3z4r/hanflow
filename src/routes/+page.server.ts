import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { isHangulOnly } from '$lib/server/korean';
import { hashSentence } from '$lib/utils/hash';
import { redis } from '$lib/server/redis';
import { parseSentence } from '$lib/server/llm/parse';
import { ParsedSentenceSchema } from '$lib/schemas/sentence';

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const sentence = (data.get('sentence') as string | null)?.trim() ?? '';

    if (!sentence) {
      return fail(400, { error: 'Please enter a Korean sentence.' });
    }

    if (!isHangulOnly(sentence)) {
      return fail(422, { error: 'Please enter Korean text only (한글).' });
    }

    const hash = await hashSentence(sentence);
    const cacheKey = `hanflow:parsed:${hash}`;

    // Cache check
    let parsed;
    const cached = await redis.get(cacheKey);
    if (cached) {
      try {
        const result = ParsedSentenceSchema.safeParse(JSON.parse(cached));
        if (result.success) parsed = result.data;
      } catch { /* corrupted cache entry — fall through to LLM */ }
    }

    // LLM call on miss
    if (!parsed) {
      try {
        parsed = await parseSentence(sentence);
      } catch {
        return fail(500, { error: 'Failed to analyse sentence. Please try again.' });
      }
      await redis.setex(cacheKey, 60 * 60 * 24 * 7, JSON.stringify(parsed));
    }

    cookies.set('hf_result', JSON.stringify(parsed), {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 day (shorter than Redis TTL)
      sameSite: 'lax',
    });

    redirect(303, '/canvas');
  },
};
