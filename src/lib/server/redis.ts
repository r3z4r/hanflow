import { Redis } from 'ioredis';
import { REDIS_URL } from '$env/static/private';

declare global {
	var __redis: Redis | undefined;
}

if (!globalThis.__redis) {
	const client = new Redis(REDIS_URL, {
		maxRetriesPerRequest: 3,
		lazyConnect: true,
	});
	// Redis is a cache, not a source of truth. Without an 'error' listener ioredis
	// emits "Unhandled error event" and can crash the process when the server is
	// unreachable. Log quietly instead and let cacheGet/cacheSet fail soft.
	client.on('error', (err) => {
		console.warn('[redis] connection error (cache bypassed until it recovers):', err.message);
	});
	globalThis.__redis = client;
}

export const redis = globalThis.__redis;

/**
 * Read from the cache, treating any Redis failure as a miss. Redis is an
 * optional accelerator — an outage must degrade to a slower path, never a 500.
 */
export async function cacheGet(key: string): Promise<string | null> {
	try {
		return await redis.get(key);
	} catch (err) {
		console.warn('[redis] cacheGet failed, treating as miss:', (err as Error).message);
		return null;
	}
}

/**
 * Write to the cache, swallowing any Redis failure — a failed cache write must
 * not break the request that produced the value.
 */
export async function cacheSet(key: string, ttlSeconds: number, value: string): Promise<void> {
	try {
		await redis.setex(key, ttlSeconds, value);
	} catch (err) {
		console.warn('[redis] cacheSet failed, continuing without caching:', (err as Error).message);
	}
}
