import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll } from "vitest";

const TEST_PROJECT_IDS = [
	"wt_golden", "wt_idem", "wt_big", "wt_check", "wt_deploy",
]

beforeAll(async () => {
	await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
	const stmt = env.DB.prepare("INSERT OR IGNORE INTO projects (project_id, name) VALUES (?, ?)");
	for (const id of TEST_PROJECT_IDS) {
		await stmt.bind(id, `Test ${id}`).run();
	}
});
