import { redirect } from '@sveltejs/kit';
import { eq, and, desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { ParsedSentenceSchema } from '$lib/schemas/sentence';
import { cacheGet, cacheSet } from '$lib/server/redis';
import { db } from '$lib/server/db';
import { sentenceHistory } from '$lib/server/db/schema';

// The current user's most-recent history row for this sentence, for the favorite
// toggle. null when logged out or the user has no row for it (e.g. shared link).
async function getFavorite(userId: string, hash: string) {
	const rows = await db
		.select({ id: sentenceHistory.id, isFavorited: sentenceHistory.isFavorited })
		.from(sentenceHistory)
		.where(and(eq(sentenceHistory.userId, userId), eq(sentenceHistory.sentenceHash, hash)))
		.orderBy(desc(sentenceHistory.createdAt))
		.limit(1);
	return rows[0] ?? null;
}

export const load: PageServerLoad = async ({ url, cookies, locals }) => {
	const hash = url.searchParams.get('hash') ?? cookies.get('hf_key');
	if (!hash) redirect(303, '/');

	const session = await locals.auth();
	const favorite = session?.user?.id ? await getFavorite(session.user.id, hash) : null;

	const cached = await cacheGet(`hanflow:parsed:${hash}`);
	if (cached) {
		try {
			const result = ParsedSentenceSchema.safeParse(JSON.parse(cached));
			if (result.success) return { parsedSentence: result.data, hash, favorite };
		} catch {
			// corrupted cache entry — fall through to DB lookup
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

	await cacheSet(`hanflow:parsed:${hash}`, 60 * 60 * 24 * 7, JSON.stringify(result.data));
	return { parsedSentence: result.data, hash, favorite };
};
