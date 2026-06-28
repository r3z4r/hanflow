import { normalizeInput, containsHangul } from './korean';
import { segment } from './segment';
import { hashText } from '$lib/utils/hash';
import type { Mode } from '$lib/schemas/analysis';

export interface BuiltSegment {
	segHash: string;
	segmentText: string;
	unitType: string;
	ordinal: number;
}

export interface BuiltDocument {
	normalized: string;
	docHash: string;
	segments: BuiltSegment[];
	truncated: boolean;
	totalUnits: number;
}

const NO_KOREAN_HINT = 'No Korean detected — enter some 한글 to analyze.';

/**
 * Normalize + gate + segment + hash raw input into an insertable document. Returns
 * a soft hint (not an error) when the input has no Hangul, honoring the
 * sanitize-don't-restrict rule. `mode` is recorded as the document's default mode.
 */
export async function buildDocumentInput(
	raw: string,
	mode: Mode
): Promise<{ ok: true; doc: BuiltDocument } | { ok: false; hint: string }> {
	const normalized = normalizeInput(raw);
	if (!normalized || !containsHangul(normalized)) {
		return { ok: false, hint: NO_KOREAN_HINT };
	}

	const { segments, totalUnits, truncated } = segment(normalized);
	const docHash = await hashText(normalized);
	const built: BuiltSegment[] = await Promise.all(
		segments.map(async (s) => ({
			segHash: await hashText(s.text),
			segmentText: s.text,
			unitType: s.unitType,
			ordinal: s.ordinal
		}))
	);

	// `mode` is recorded by the caller as document.defaultMode; surfaced here so the
	// builder is the single place input shaping happens.
	void mode;
	return { ok: true, doc: { normalized, docHash, segments: built, truncated, totalUnits } };
}
