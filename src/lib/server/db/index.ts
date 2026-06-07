import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { DATABASE_URL } from '$env/static/private';
import * as schema from './schema';

const { Pool } = pg;

declare global {
	// eslint-disable-next-line no-var
	var __pool: pg.Pool | undefined;
}

if (!globalThis.__pool) {
	globalThis.__pool = new Pool({ connectionString: DATABASE_URL });
}

export const db = drizzle(globalThis.__pool, { schema });
