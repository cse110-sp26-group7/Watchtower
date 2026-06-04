import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineWorkersConfig, readD1Migrations } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig(async () => {
	const dirname = path.dirname(fileURLToPath(import.meta.url));
	// Canonical schema lives at repo-root db/migrations/ — single source of
	// truth for production (wrangler d1 migrations apply) and tests.
	const migrations = await readD1Migrations(path.join(dirname, '..', '..', 'db', 'migrations'));

	return {
		test: {
			setupFiles: ['./test/apply-migrations.js'],
			poolOptions: {
				workers: {
					singleWorker: true,
					isolatedStorage: true,
					wrangler: { configPath: './wrangler.jsonc' },
					miniflare: {
						bindings: {
							TEST_MIGRATIONS: migrations,
							// Mirrors the `wrangler secret` SESSION_SECRET and the
							// ALLOWED_ORIGINS var so SELF.fetch exercises auth + CORS.
							SESSION_SECRET: 'test-secret-key',
							ALLOWED_ORIGINS: 'https://watchtower-page.pages.dev,http://localhost:5500',
						},
					},
				},
			},
		},
	};
});
