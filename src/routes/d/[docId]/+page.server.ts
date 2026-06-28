import { redirect } from '@sveltejs/kit';
import { eq, asc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { documents, segments } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ params }) => {
	const docRows = await db
		.select({
			id: documents.id,
			rawInput: documents.rawInput,
			defaultMode: documents.defaultMode
		})
		.from(documents)
		.where(eq(documents.id, params.docId))
		.limit(1);
	if (docRows.length === 0) redirect(303, '/');

	const segRows = await db
		.select({
			ordinal: segments.ordinal,
			segHash: segments.segHash,
			segmentText: segments.segmentText,
			unitType: segments.unitType
		})
		.from(segments)
		.where(eq(segments.documentId, params.docId))
		.orderBy(asc(segments.ordinal));

	return { document: docRows[0], segments: segRows };
};
