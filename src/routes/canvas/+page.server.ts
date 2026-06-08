import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { ParsedSentenceSchema } from '$lib/schemas/sentence';

export const load: PageServerLoad = async ({ cookies }) => {
	const raw = cookies.get('hf_result');
	if (!raw) redirect(303, '/');

	try {
		const result = ParsedSentenceSchema.safeParse(JSON.parse(raw));
		if (!result.success) redirect(303, '/');
		return { parsedSentence: result.data };
	} catch {
		redirect(303, '/');
	}
};
