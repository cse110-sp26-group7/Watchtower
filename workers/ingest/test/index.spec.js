import { env, SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";

const URL_INGEST = "https://example.com/ingest";

function makeEvent(overrides = {}) {
	return {
		event_id: crypto.randomUUID(),
		event_type: "error",
		timestamp: "2026-05-18T10:00:00.000Z",
		environment: "prod",
		message: "boom",
		name: "TypeError",
		handled: false,
		...overrides,
	};
}

function postIngest(body, init = {}) {
	return SELF.fetch(URL_INGEST, {
		method: "POST",
		headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
		body: typeof body === "string" ? body : JSON.stringify(body),
		...init,
	});
}

async function selectByProject(projectId) {
	const { results } = await env.DB
		.prepare("SELECT * FROM events WHERE project_id = ? ORDER BY timestamp")
		.bind(projectId)
		.all();
	return results;
}

describe("POST /ingest", () => {
	it("1. inserts a valid event and returns 204", async () => {
		const projectId = "wt_golden";
		const event = makeEvent({
			url: "https://example.com/checkout",
			session_id: crypto.randomUUID(),
		});
		const res = await postIngest({ project_id: projectId, events: [event] });
		expect(res.status).toBe(204);

		const rows = await selectByProject(projectId);
		expect(rows).toHaveLength(1);
		expect(rows[0].event_id).toBe(event.event_id);
		expect(rows[0].event_type).toBe("error");
		expect(rows[0].received_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);

		const payload = JSON.parse(rows[0].payload);
		expect(payload.message).toBe("boom");
		expect(payload.name).toBe("TypeError");
		expect(payload.handled).toBe(false);
		expect(payload.url).toBe("https://example.com/checkout");
		// user_agent is server-enriched into the payload for browser events.
		expect(payload).toHaveProperty("user_agent");
	});

	it("2. is idempotent on duplicate event_id (ON CONFLICT DO NOTHING)", async () => {
		const projectId = "wt_idem";
		const event = makeEvent({
			event_type: "feedback",
			feedback_rating: 5,
			comment: "ok",
		});
		const envelope = { project_id: projectId, events: [event] };

		const r1 = await postIngest(envelope);
		const r2 = await postIngest(envelope);
		expect(r1.status).toBe(204);
		expect(r2.status).toBe(204);

		const rows = await selectByProject(projectId);
		expect(rows).toHaveLength(1);
	});

	it("3. rejects malformed JSON with 400 bad_json", async () => {
		const res = await postIngest('{"bad');
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe("bad_json");
	});

	it("4. rejects malformed envelope with 400 bad_envelope", async () => {
		const res = await postIngest({ hello: "world" });
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe("bad_envelope");
	});

	it("5. rejects batch > 100 events with 413 batch_too_large", async () => {
		const events = Array.from({ length: 101 }, () => makeEvent());
		const res = await postIngest({ project_id: "wt_big", events });
		expect(res.status).toBe(413);
		const body = await res.json();
		expect(body.error).toBe("batch_too_large");

		const rows = await selectByProject("wt_big");
		expect(rows).toHaveLength(0);
	});

	it("6a. responds to OPTIONS /ingest with 204 + CORS headers", async () => {
		const res = await SELF.fetch(URL_INGEST, { method: "OPTIONS" });
		expect(res.status).toBe(204);
		expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
		expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
	});

	it("6b. responds to OPTIONS on unknown path with 404", async () => {
		const res = await SELF.fetch("https://example.com/random", {
			method: "OPTIONS",
		});
		expect(res.status).toBe(404);
	});

	it("7. surfaces CHECK violation as 400 insert_failed", async () => {
		const projectId = "wt_check";
		// event_type CHECK rejects anything outside the enum.
		const event = makeEvent({ event_type: "invalid_type" });
		const res = await postIngest({ project_id: projectId, events: [event] });
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe("insert_failed");

		const rows = await selectByProject(projectId);
		expect(rows).toHaveLength(0);
	});

	it("8. deploy events have no user_agent in payload", async () => {
		const projectId = "wt_deploy";
		const event = {
			event_id: crypto.randomUUID(),
			event_type: "deploy",
			timestamp: "2026-05-18T10:00:00.000Z",
			environment: "prod",
			deploy_id: "abc1234",
			version: "v0.1.0",
		};
		const res = await postIngest({ project_id: projectId, events: [event] });
		expect(res.status).toBe(204);

		const rows = await selectByProject(projectId);
		expect(rows).toHaveLength(1);
		const payload = JSON.parse(rows[0].payload);
		expect(payload.version).toBe("v0.1.0");
		expect(payload).not.toHaveProperty("user_agent");
	});
});
