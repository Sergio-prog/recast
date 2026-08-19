import { describe, expect, it } from "vitest";
import {
	cellAddress,
	columnLabel,
	compareCells,
	detectKind,
} from "@/lib/viewer";

describe("detectKind", () => {
	it("uses the extension first", () => {
		expect(detectKind({ name: "data.CSV" })).toBe("csv");
		expect(detectKind({ name: "report.xlsx" })).toBe("xlsx");
		expect(detectKind({ name: "a.b.pdf" })).toBe("pdf");
		expect(detectKind({ name: "notes.tsv" })).toBe("csv");
	});

	it("falls back to the mime type", () => {
		expect(detectKind({ name: "blob", type: "application/pdf" })).toBe("pdf");
		expect(detectKind({ name: "blob", type: "text/csv" })).toBe("csv");
		expect(
			detectKind({
				name: "blob",
				type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			}),
		).toBe("xlsx");
	});

	it("returns null for unknown files", () => {
		expect(detectKind({ name: "photo.png", type: "image/png" })).toBeNull();
	});
});

describe("columnLabel / cellAddress", () => {
	it("produces spreadsheet column letters", () => {
		expect(columnLabel(0)).toBe("A");
		expect(columnLabel(25)).toBe("Z");
		expect(columnLabel(26)).toBe("AA");
		expect(columnLabel(27)).toBe("AB");
		expect(columnLabel(701)).toBe("ZZ");
		expect(columnLabel(702)).toBe("AAA");
	});

	it("builds 1-based addresses", () => {
		expect(cellAddress(0, 0)).toBe("A1");
		expect(cellAddress(11, 2)).toBe("C12");
	});
});

describe("compareCells", () => {
	it("compares numbers numerically", () => {
		expect(compareCells("10", "9")).toBeGreaterThan(0);
		expect(compareCells("1,000", "999")).toBeGreaterThan(0);
	});

	it("sorts empty cells last", () => {
		expect(compareCells("", "a")).toBeGreaterThan(0);
		expect(compareCells("a", "")).toBeLessThan(0);
	});

	it("compares text case-insensitively with numeric awareness", () => {
		expect(compareCells("apple", "Banana")).toBeLessThan(0);
		expect(compareCells("file2", "file10")).toBeLessThan(0);
	});
});
