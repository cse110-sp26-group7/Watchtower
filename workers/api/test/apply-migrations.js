import { applyD1Migrations, env } from 'cloudflare:test';

// Apply forward migrations once to the root D1 state. With
// isolatedStorage: true, each test forks from this state — schema is
// shared, row writes are per-test.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
