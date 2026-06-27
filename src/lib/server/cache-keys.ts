import type { Aspect } from '$lib/schemas/analysis';

/**
 * Redis key for one cached aspect of one segment. Keyed by segment hash (not
 * document) so the same sentence reuses its cached aspects across documents.
 * 7-day TTL is applied by the writer (Sub-spec 2), not here.
 */
export function segmentAspectKey(segHash: string, aspect: Aspect): string {
	return `hanflow:seg:${segHash}:${aspect}`;
}
