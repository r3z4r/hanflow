import { MODE_ASPECTS, ModeSchema, AspectSchema, type Aspect } from '$lib/schemas/analysis';

/**
 * Resolve which aspects an /api/analyze request should compute. A valid `mode`
 * expands to its bundle; otherwise an explicit `aspects` csv is used (invalid
 * names dropped); otherwise the default is the full bundle. Result is de-duped.
 */
export function resolveAspectSet(params: { mode?: string | null; aspects?: string | null }): Aspect[] {
	const mode = ModeSchema.safeParse(params.mode);
	if (mode.success) return [...new Set(MODE_ASPECTS[mode.data])];

	if (params.aspects) {
		const parsed = params.aspects
			.split(',')
			.map((a) => a.trim())
			.map((a) => AspectSchema.safeParse(a))
			.filter((r) => r.success)
			.map((r) => r.data);
		if (parsed.length > 0) return [...new Set(parsed)];
	}

	return [...new Set(MODE_ASPECTS.full)];
}
