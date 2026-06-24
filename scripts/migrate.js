import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

// Deploy-time migration runner. Uses only production dependencies (drizzle-orm + pg)
// so it runs inside the slim prod image, where drizzle-kit is not installed. Reads
// DATABASE_URL straight from the environment rather than SvelteKit's $env, so it can
// be invoked outside the app process (e.g. Railway's preDeployCommand).
const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
	console.error('migrate: DATABASE_URL is not set');
	process.exit(1);
}

const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), '..', 'drizzle', 'migrations');

const pool = new pg.Pool({ connectionString: DATABASE_URL });
try {
	await migrate(drizzle(pool), { migrationsFolder });
	console.log('migrate: migrations applied');
} finally {
	await pool.end();
}
