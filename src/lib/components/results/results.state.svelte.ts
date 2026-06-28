import type { Aspect } from '$lib/schemas/analysis';
import type { AspectResult } from '$lib/schemas/aspects';

// Aspects received for one segment, keyed by aspect name.
export type SegmentAspects = Partial<Record<Aspect, AspectResult>>;

export interface ResultsState {
	get(ordinal: number): SegmentAspects;
	readonly done: boolean;
}

/**
 * Holds streamed aspect results keyed by segment ordinal. Task 9 wires the live
 * EventSource + mode upgrade into this factory; Task 8 renders from `get()`.
 */
export function createResultsState() {
	const byOrdinal = $state<Record<number, SegmentAspects>>({});
	let done = $state(false);

	return {
		get: (ordinal: number): SegmentAspects => byOrdinal[ordinal] ?? {},
		set(ordinal: number, aspect: Aspect, result: AspectResult) {
			byOrdinal[ordinal] = { ...(byOrdinal[ordinal] ?? {}), [aspect]: result };
		},
		markDone() {
			done = true;
		},
		get done() {
			return done;
		}
	};
}
