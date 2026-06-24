import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { parseFeedback } from '$lib/server/db/schema';
import { hashSentence } from '$lib/utils/hash';
import { isHangulOnly } from '$lib/server/korean';

const requestSchema = z.object({
	sentenceText: z.string().min(1).max(500),
	reason: z.string().max(1000).optional()
});

export const POST: RequestHandler = async ({ request, locals }) => {
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

	const sentenceText = validation.data.sentenceText.trim();
	if (!isHangulOnly(sentenceText)) {
		return json({ error: 'Invalid sentence' }, { status: 422 });
	}

	const session = await locals.auth();
	const reason = validation.data.reason?.trim();

	await db.insert(parseFeedback).values({
		userId: session?.user?.id ?? null,
		sentenceHash: await hashSentence(sentenceText),
		sentenceText,
		reason: reason || null
	});

	return json({ ok: true }, { status: 201 });
};
