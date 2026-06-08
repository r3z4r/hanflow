import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { ParsedSentenceSchema } from '$lib/schemas/sentence';
import { redis } from '$lib/server/redis';

export const load: PageServerLoad = async ({ cookies }) => {
	const hash = cookies.get('hf_key');
	if (!hash) redirect(303, '/');

	const cached = await redis.get(`hanflow:parsed:${hash}`);
	if (!cached) redirect(303, '/');

	try {
		const result = ParsedSentenceSchema.safeParse(JSON.parse(cached));
		if (!result.success) redirect(303, '/');
		return { parsedSentence: result.data };
	} catch {
		redirect(303, '/');
	}
};
