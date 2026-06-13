import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { sentenceHistory } from '$lib/server/db/schema';
import { count, desc, eq } from 'drizzle-orm';

const PAGE_SIZE = 20;

export const load: PageServerLoad = async ({ url, parent }) => {
	const { session } = await parent();
	if (!session?.user?.id) redirect(303, '/login');
	const userId = session.user.id;

	const requestedPage = Number(url.searchParams.get('page'));
	const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
	const offset = (page - 1) * PAGE_SIZE;

	const items = await db.query.sentenceHistory.findMany({
		where: eq(sentenceHistory.userId, userId),
		orderBy: [desc(sentenceHistory.createdAt)],
		limit: PAGE_SIZE,
		offset,
		columns: {
			id: true,
			sentenceHash: true,
			sentenceText: true,
			isFavorited: true,
			createdAt: true
		}
	});

	const [{ value: total }] = await db
		.select({ value: count() })
		.from(sentenceHistory)
		.where(eq(sentenceHistory.userId, userId));

	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

	return { items, page, totalPages };
};
