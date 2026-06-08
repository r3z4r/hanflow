import { Redis } from 'ioredis';
import { REDIS_URL } from '$env/static/private';

declare global {
	var __redis: Redis | undefined;
}

if (!globalThis.__redis) {
	globalThis.__redis = new Redis(REDIS_URL, {
		maxRetriesPerRequest: 3,
		lazyConnect: true,
	});
}

export const redis = globalThis.__redis;
