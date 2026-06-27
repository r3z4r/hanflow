import type { UnitType } from '$lib/schemas/analysis';

export const MAX_SEGMENTS = 50;

export interface Segment {
	text: string;
	unitType: UnitType;
	ordinal: number;
}

export interface SegmentResult {
	segments: Segment[];
	totalUnits: number;
	truncated: boolean;
}

const SENTENCE_FINAL = /[.!?…。]$/;
// Common declarative/polite/interrogative final syllables, used only when there
// is no terminal punctuation to lean on.
const KOREAN_ENDERS = /(다|요|까|죠)$/;

function classify(unit: string): UnitType {
	if (!/\s/.test(unit)) return 'word';
	const withoutFinalPunct = unit.replace(/[.!?…。]+$/, '');
	if (SENTENCE_FINAL.test(unit) || KOREAN_ENDERS.test(withoutFinalPunct)) return 'sentence';
	return 'fragment';
}

/**
 * Split already-normalized text into ordered analysis units. Deterministic and
 * fail-soft: it never throws and never returns zero segments for non-empty input.
 * `truncated`/`totalUnits` let the UI show an "analyzed first N of M" notice.
 */
export function segment(normalized: string): SegmentResult {
	const text = normalized.trim();
	if (!text) return { segments: [], totalUnits: 0, truncated: false };

	const units = text
		.split(/\n+/)
		.flatMap((line) => line.split(/(?<=[.!?…。])\s+/))
		.map((u) => u.trim())
		.filter(Boolean);

	// Guard: if splitting somehow produced nothing, treat the whole input as one unit.
	const safeUnits = units.length > 0 ? units : [text];

	const totalUnits = safeUnits.length;
	const kept = safeUnits.slice(0, MAX_SEGMENTS);

	return {
		segments: kept.map((u, i) => ({ text: u, unitType: classify(u), ordinal: i })),
		totalUnits,
		truncated: totalUnits > MAX_SEGMENTS
	};
}
