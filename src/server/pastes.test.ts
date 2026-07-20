import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	query: vi.fn(),
}));

vi.mock("./auth", () => ({
	getPool: () => ({ query: mocks.query }),
}));

const summaryRow = {
	id: "paste-id",
	user_id: "owner-id",
	name: "Deploy script",
	description: "Production infrastructure",
	tags: ["infra", "bash"],
	language: "bash",
	visibility: "private",
	created_at: "1000",
	expires_at: null,
};

beforeEach(() => {
	vi.resetModules();
	mocks.query.mockReset();
	mocks.query.mockImplementation((sql: string) =>
		Promise.resolve({
			rows: sql.startsWith("SELECT") ? [summaryRow] : [],
			rowCount: 0,
		}),
	);
});

async function runList(filters: { q?: string; tag?: string }) {
	const { listPastes } = await import("./pastes");
	const result = await listPastes("owner-id", filters);
	const selectCall = mocks.query.mock.calls.find(([sql]) =>
		String(sql).startsWith("SELECT"),
	);
	if (!selectCall) throw new Error("Expected a list SELECT query");
	return { result, sql: String(selectCall[0]), values: selectCall[1] };
}

describe("listPastes", () => {
	it("lists owner-scoped metadata with no filters", async () => {
		const { result, sql, values } = await runList({});

		expect(sql).toContain("WHERE user_id = $1");
		expect(sql).toContain("ORDER BY created_at DESC LIMIT 100");
		expect(sql).not.toContain("content");
		expect(values).toEqual(["owner-id"]);
		expect(result[0]).not.toHaveProperty("content");
	});

	it("searches only name and description with a placeholder", async () => {
		const { sql, values } = await runList({ q: "deploy" });

		expect(sql).toContain("WHERE user_id = $1");
		expect(sql).toContain("(name ILIKE $2 OR description ILIKE $2)");
		expect(sql).not.toMatch(/content ILIKE/);
		expect(values).toEqual(["owner-id", "%deploy%"]);
	});

	it("uses exact JSONB membership for a tag", async () => {
		const { sql, values } = await runList({ tag: "infra" });

		expect(sql).toContain("WHERE user_id = $1");
		expect(sql).toContain("tags ? $2");
		expect(values).toEqual(["owner-id", "infra"]);
	});

	it("combines query and exact tag filters with placeholders", async () => {
		const { sql, values } = await runList({ q: "deploy", tag: "infra" });

		expect(sql).toContain("WHERE user_id = $1");
		expect(sql).toContain("(name ILIKE $2 OR description ILIKE $2)");
		expect(sql).toContain("tags ? $3");
		expect(values).toEqual(["owner-id", "%deploy%", "infra"]);
	});
});
