import type { Aspect } from '$lib/schemas/analysis';
import { ASPECT_SCHEMAS, type AspectResult } from '$lib/schemas/aspects';
import { cacheGet, cacheSet } from './redis';
import { segmentAspectKey } from './cache-keys';
import { db } from './db';
import { segmentAspects } from './db/schema';
import { and, eq } from 'drizzle-orm';
import { resolveAspect } from './aspect-resolver';

const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

/**
 * Read-through cache for one aspect of one segment: Redis (hot) →
 * segment_aspects (cold) → compute. Fail-soft at every tier — a Redis or DB
 * outage degrades to the next tier, never throws to the caller. The aspect's
 * schema validates cached payloads; corrupt entries are treated as misses.
 */
export function getAspect(
	segHash: string,
	aspect: Aspect,
	compute: () => Promise<AspectResult>
): Promise<AspectResult> {
	const key = segmentAspectKey(segHash, aspect);
	const schema = ASPECT_SCHEMAS[aspect];
	const validate = (raw: unknown): AspectResult | null => {
		const parsed = schema.safeParse(raw);
		return parsed.success ? (parsed.data as AspectResult) : null;
	};

	return resolveAspect({
		hotGet: async () => {
			const cached = await cacheGet(key); // cacheGet already swallows Redis errors
			if (!cached) return null;
			try {
				return JSON.parse(cached);
			} catch {
				return null; // corrupt JSON → miss
			}
		},
		coldGet: async () => {
			try {
				const rows = await db
					.select({ result: segmentAspects.result })
					.from(segmentAspects)
					.where(and(eq(segmentAspects.segHash, segHash), eq(segmentAspects.aspect, aspect)))
					.limit(1);
				return rows[0]?.result ?? null;
			} catch {
				return null; // DB outage → miss
			}
		},
		hotSet: async (value) => {
			await cacheSet(key, TTL_SECONDS, JSON.stringify(value)); // cacheSet already swallows errors
		},
		coldSet: async (value) => {
			try {
				await db
					.insert(segmentAspects)
					.values({ segHash, aspect, result: value })
					.onConflictDoUpdate({
						target: [segmentAspects.segHash, segmentAspects.aspect],
						set: { result: value }
					});
			} catch {
				/* a cold-cache write failure must not break the request */
			}
		},
		validate,
		compute
	});
}
