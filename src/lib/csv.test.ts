import { describe, expect, it } from "vitest";
import { parseCsv, sniffDelimiter, toCsv } from "@/lib/csv";

describe("parseCsv", () => {
	it("splits rows and fields", () => {
		expect(parseCsv("a,b,c\n1,2,3")).toEqual([
			["a", "b", "c"],
			["1", "2", "3"],
		]);
	});

	it("handles quotes, escaped quotes and embedded newlines", () => {
		expect(parseCsv('name,note\n"Smith, J","said ""hi""\nbye"')).toEqual([
			["name", "note"],
			["Smith, J", 'said "hi"\nbye'],
		]);
	});

	it("handles CRLF and a trailing newline", () => {
		expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
			["a", "b"],
			["1", "2"],
		]);
	});

	it("keeps empty fields", () => {
		expect(parseCsv("a,,c\n,,")).toEqual([
			["a", "", "c"],
			["", "", ""],
		]);
	});

	it("strips a UTF-8 BOM", () => {
		expect(parseCsv("﻿a,b")).toEqual([["a", "b"]]);
	});

	it("returns no rows for empty input", () => {
		expect(parseCsv("")).toEqual([]);
	});
});

describe("sniffDelimiter", () => {
	it("detects semicolons", () => {
		expect(sniffDelimiter("a;b;c\n1;2;3\n4;5;6")).toBe(";");
	});

	it("detects tabs", () => {
		expect(sniffDelimiter("a\tb\n1\t2")).toBe("\t");
	});

	it("prefers the consistent delimiter over a frequent one", () => {
		expect(sniffDelimiter("a;b;c\n1,5;2,25;3\n4;5;6,0")).toBe(";");
	});

	it("defaults to comma", () => {
		expect(sniffDelimiter("single")).toBe(",");
	});
});

describe("toCsv", () => {
	it("quotes only when needed and round-trips", () => {
		const rows = [
			["plain", "with,comma", 'with "quote"', "multi\nline"],
			["", "x", "", ""],
		];
		const text = toCsv(rows);
		expect(text).toBe(
			'plain,"with,comma","with ""quote""","multi\nline"\r\n,x,,',
		);
		expect(parseCsv(text, ",")).toEqual(rows);
	});
});
