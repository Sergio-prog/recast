import { describe, expect, it } from "vitest";
import { parsePasteSearch } from "./paste-search";

describe("parsePasteSearch", () => {
	it("treats blank values as absent", () => {
		expect(parsePasteSearch(new URLSearchParams("q=%20%20&tag="))).toEqual({
			ok: true,
			filters: {},
		});
	});

	it("parses valid filters and normalizes the tag", () => {
		expect(
			parsePasteSearch(
				new URLSearchParams({ q: "  deploy script ", tag: " InFrA " }),
			),
		).toEqual({
			ok: true,
			filters: { q: "deploy script", tag: "infra" },
		});
	});

	it("rejects over-limit values instead of truncating them", () => {
		expect(
			parsePasteSearch(new URLSearchParams({ q: "q".repeat(101) })).ok,
		).toBe(false);
		expect(
			parsePasteSearch(new URLSearchParams({ tag: "t".repeat(25) })).ok,
		).toBe(false);
	});

	it("rejects duplicate filter parameters", () => {
		expect(parsePasteSearch(new URLSearchParams("q=one&q=two"))).toEqual({
			ok: false,
			error: "Invalid paste search filters",
		});
	});
});
