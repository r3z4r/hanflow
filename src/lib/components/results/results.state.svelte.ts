import { browser } from '$app/environment';
import { MODE_ASPECTS, type Aspect, type Mode } from '$lib/schemas/analysis';
import type { AspectResult } from '$lib/schemas/aspects';

export type SegmentAspects = Partial<Record<Aspect, AspectResult>>;

/**
 * Streams /api/analyze results into a per-ordinal store. Opens one stream for the
 * initial mode; switching to a richer mode opens a follow-up stream for only the
 * aspects not yet requested (lazy upgrade). Cache hits stream back immediately,
 * so re-requesting an already-cached aspect is cheap and idempotent.
 */
export function createResultsState(docId: string, initialMode: Mode) {
	const byOrdinal = $state<Record<number, SegmentAspects>>({});
	const requested = new Set<Aspect>();
	let sources: EventSource[] = [];

	function open(aspects: Aspect[]) {
		if (!browser) return;   // EventSource is browser-only
		const fresh = aspects.filter((a) => !requested.has(a));
		if (fresh.length === 0) return;
		fresh.forEach((a) => requested.add(a));

		const es = new EventSource(`/api/analyze?doc=${docId}&aspects=${fresh.join(',')}`);
		sources.push(es);
		es.addEventListener('aspect', (e) => {
			let payload;
			try {
				payload = JSON.parse((e as MessageEvent).data);
			} catch {
				console.warn('[analyze] unparseable aspect event');
				return;
			}
			const { ordinal, aspect, result } = payload;
			byOrdinal[ordinal] = { ...(byOrdinal[ordinal] ?? {}), [aspect as Aspect]: result };
		});
		es.addEventListener('done', () => es.close());
		es.addEventListener('aspect_error', (e) => {
			console.warn('[analyze] aspect failed', (e as MessageEvent).data);
		});
	}

	open(MODE_ASPECTS[initialMode]);

	return {
		get: (ordinal: number): SegmentAspects => byOrdinal[ordinal] ?? {},
		requestMode: (mode: Mode) => open(MODE_ASPECTS[mode]),
		close: () => {
			sources.forEach((s) => s.close());
			sources = [];
		}
	};
}
