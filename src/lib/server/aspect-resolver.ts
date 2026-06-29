import type { AspectResult } from '$lib/schemas/aspects';

/**
 * IO seams for resolveAspect. Each getter returns the parsed value or null; each
 * setter must be fail-soft (a cache write failure must not throw). `validate`
 * returns the value when a cached payload matches the aspect schema, else null.
 */
export interface AspectResolverIO {
	hotGet: () => Promise<unknown | null>;
	coldGet: () => Promise<unknown | null>;
	hotSet: (value: AspectResult) => Promise<void>;
	coldSet: (value: AspectResult) => Promise<void>;
	validate: (raw: unknown) => AspectResult | null;
	compute: () => Promise<AspectResult>;
}

/**
 * Read-through resolution: Redis (hot) → segment_aspects (cold) → compute.
 * A valid cold hit reseeds hot; a full miss computes once and writes both tiers.
 * Corrupt cached payloads (validate → null) are treated as misses.
 */
export async function resolveAspect(io: AspectResolverIO): Promise<AspectResult> {
	const hot = await io.hotGet();
	if (hot !== null) {
		const valid = io.validate(hot);
		if (valid !== null) return valid;
	}

	const cold = await io.coldGet();
	if (cold !== null) {
		const valid = io.validate(cold);
		if (valid !== null) {
			await io.hotSet(valid);
			return valid;
		}
	}

	const computed = await io.compute();
	await io.hotSet(computed);
	await io.coldSet(computed);
	return computed;
}
