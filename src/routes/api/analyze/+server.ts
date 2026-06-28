import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { eq, asc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { documents, segments } from '$lib/server/db/schema';
import { resolveAspectSet } from '$lib/server/analyze-aspects';
import { sseFrame } from '$lib/server/sse';
import { getAspect } from '$lib/server/aspect-cache';
import { parseAspect } from '$lib/server/llm/parse';

const CONCURRENCY = 4;

export const GET: RequestHandler = async ({ url }) => {
	const docId = url.searchParams.get('doc');
	if (!docId) error(400, 'missing doc');

	const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if (!UUID_RE.test(docId)) error(404, 'document not found');

	const docRows = await db
		.select({ id: documents.id })
		.from(documents)
		.where(eq(documents.id, docId))
		.limit(1);
	if (docRows.length === 0) error(404, 'document not found');

	const segRows = await db
		.select({
			ordinal: segments.ordinal,
			segHash: segments.segHash,
			segmentText: segments.segmentText
		})
		.from(segments)
		.where(eq(segments.documentId, docId))
		.orderBy(asc(segments.ordinal));

	const aspects = resolveAspectSet({
		mode: url.searchParams.get('mode'),
		aspects: url.searchParams.get('aspects')
	});

	// One unit of work = one (segment, aspect) pair.
	const jobs = segRows.flatMap((seg) => aspects.map((aspect) => ({ seg, aspect })));

	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			const encoder = new TextEncoder();
			const send = (event: string, data: unknown) => {
				try {
					controller.enqueue(encoder.encode(sseFrame(event, data)));
				} catch {
					/* client disconnected — stream cancelled; nothing to flush */
				}
			};

			let cursor = 0;
			async function worker() {
				while (cursor < jobs.length) {
					const { seg, aspect } = jobs[cursor++];
					try {
						const result = await getAspect(seg.segHash, aspect, () =>
							parseAspect(aspect, seg.segmentText)
						);
						send('aspect', { ordinal: seg.ordinal, segHash: seg.segHash, aspect, result });
					} catch (e) {
						send('aspect_error', {
							ordinal: seg.ordinal,
							aspect,
							message: e instanceof Error ? e.message : 'analysis failed'
						});
					}
				}
			}

			await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker));
			send('done', {});
			try { controller.close(); } catch { /* already closed/cancelled */ }
		}
	});

	return new Response(stream, {
		headers: {
			'content-type': 'text/event-stream',
			'cache-control': 'no-cache',
			connection: 'keep-alive'
		}
	});
};
