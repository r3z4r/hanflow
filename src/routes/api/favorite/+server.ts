import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { sentenceHistory } from '$lib/server/db/schema';
import { sql, and, eq } from 'drizzle-orm';

const requestSchema = z.object({
	id: z.string().uuid()
});

export const PATCH: RequestHandler = async ({ request, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}

	const validation = requestSchema.safeParse(body);
	if (!validation.success) {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}

	const { id } = validation.data;

	const result = await db
		.update(sentenceHistory)
		.set({ isFavorited: sql`NOT ${sentenceHistory.isFavorited}` })
		.where(and(eq(sentenceHistory.id, id), eq(sentenceHistory.userId, session.user.id)))
		.returning({ id: sentenceHistory.id, isFavorited: sentenceHistory.isFavorited });

	if (result.length === 0) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	return json({ isFavorited: result[0].isFavorited }, { status: 200 });
};
