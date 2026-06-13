import { redirect } from '@sveltejs/kit';
import { eq, desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { ParsedSentenceSchema } from '$lib/schemas/sentence';
import { redis } from '$lib/server/redis';
import { db } from '$lib/server/db';
import { sentenceHistory } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ url, cookies }) => {
	const hash = url.searchParams.get('hash') ?? cookies.get('hf_key');
	if (!hash) redirect(303, '/');

	const cached = await redis.get(`hanflow:parsed:${hash}`);
	if (cached) {
		try {
			const result = ParsedSentenceSchema.safeParse(JSON.parse(cached));
			if (result.success) return { parsedSentence: result.data };
		} catch {
			// noop
		}
	}

	const rows = await db
		.select({ parsedResult: sentenceHistory.parsedResult })
		.from(sentenceHistory)
		.where(eq(sentenceHistory.sentenceHash, hash))
		.orderBy(desc(sentenceHistory.createdAt))
		.limit(1);

	if (rows.length === 0) redirect(303, '/');

	const result = ParsedSentenceSchema.safeParse(rows[0].parsedResult);
	if (!result.success) redirect(303, '/');

	await redis.setex(`hanflow:parsed:${hash}`, 60 * 60 * 24 * 7, JSON.stringify(result.data));
	return { parsedSentence: result.data };
};
