import { describe, expect, it } from "vitest";
import {
	CHROME,
	computeLayout,
	DEFAULT_SETTINGS,
	effectiveExportScale,
	exportFileName,
	type Measure,
	normalizeCode,
	parseHexColor,
	resolveWindowWidth,
	rgba,
	sanitizeSettings,
} from "./model";

const measure: Measure = {
	code: (text) => text.length * 8,
	title: (text) => text.length * 7,
};

const KNOWN = { languages: ["typescript", "go"], themes: ["catppuccin"] };
const LONG_LINE = "x".repeat(100);

describe("computeLayout", () => {
	it("wraps the window in the padding when the ratio is auto", () => {
		const layout = computeLayout(
			{ ...DEFAULT_SETTINGS, padding: 64, ratioId: "auto" },
			[LONG_LINE, "short"],
			measure,
		);
		expect(layout.frame.width).toBe(layout.window.width + 128);
		expect(layout.frame.height).toBe(layout.window.height + 128);
		expect(layout.window.x).toBe(64);
		expect(layout.window.y).toBe(64);
	});

	it("grows the frame to a fixed ratio without shrinking the padding", () => {
		for (const ratioId of ["16:9", "1:1", "9:16"] as const) {
			const layout = computeLayout(
				{ ...DEFAULT_SETTINGS, padding: 32, ratioId },
				[LONG_LINE],
				measure,
			);
			const [w, h] = ratioId.split(":").map(Number);
			expect(layout.frame.width / layout.frame.height).toBeCloseTo(w / h, 1);
			expect(layout.window.x).toBeGreaterThanOrEqual(32);
			expect(layout.window.y).toBeGreaterThanOrEqual(32);
		}
	});

	it("drops the title bar for the bare window style", () => {
		const withBar = computeLayout(DEFAULT_SETTINGS, ["a"], measure);
		const bare = computeLayout(
			{ ...DEFAULT_SETTINGS, windowStyle: "none" },
			["a"],
			measure,
		);
		expect(withBar.barHeight).toBe(CHROME.barHeight);
		expect(bare.barHeight).toBe(0);
		expect(bare.window.height).toBeLessThan(withBar.window.height);
	});

	it("widens the window so a long title clears the window controls", () => {
		const title = "a-very-long-file-name-for-a-tiny-snippet.config.ts";
		const layout = computeLayout(
			{ ...DEFAULT_SETTINGS, title },
			["a"],
			measure,
		);
		expect(layout.title.x).toBeGreaterThanOrEqual(CHROME.titleReserve);
		expect(layout.title.x + layout.title.width).toBeLessThanOrEqual(
			layout.window.width - CHROME.titleReserve,
		);
	});

	it("left-aligns the title for the Windows style", () => {
		const layout = computeLayout(
			{ ...DEFAULT_SETTINGS, windowStyle: "windows" },
			["a"],
			measure,
		);
		expect(layout.title.x).toBe(CHROME.windowsTitleX);
	});

	it("honors a wider custom window but never clips the content", () => {
		const auto = computeLayout(DEFAULT_SETTINGS, [LONG_LINE], measure);
		const wide = computeLayout(
			{ ...DEFAULT_SETTINGS, windowWidth: auto.contentWidth + 200 },
			[LONG_LINE],
			measure,
		);
		const narrow = computeLayout(
			{ ...DEFAULT_SETTINGS, windowWidth: 400 },
			[LONG_LINE],
			measure,
		);
		expect(wide.window.width).toBe(auto.window.width + 200);
		expect(wide.contentWidth).toBe(auto.contentWidth);
		expect(narrow.window.width).toBe(auto.window.width);
	});

	it("reserves a gutter sized to the widest line number", () => {
		const lines = Array.from({ length: 120 }, () => "a");
		const plain = computeLayout(DEFAULT_SETTINGS, lines, measure);
		const numbered = computeLayout(
			{ ...DEFAULT_SETTINGS, lineNumbers: true },
			lines,
			measure,
		);
		expect(plain.gutterWidth).toBe(0);
		expect(numbered.gutterWidth).toBe(3 * 8 + 20);
		expect(numbered.code.x).toBe(plain.code.x + numbered.gutterWidth);
	});
});

describe("sanitizeSettings", () => {
	it("falls back to defaults for unknown or malformed values", () => {
		const settings = sanitizeSettings(
			{
				language: "cobol",
				themeId: "nope",
				mode: "sepia",
				blur: 9000,
				padding: 50,
				exportScale: 3,
				lineNumbers: "yes",
			},
			KNOWN,
		);
		expect(settings.language).toBe(DEFAULT_SETTINGS.language);
		expect(settings.themeId).toBe(DEFAULT_SETTINGS.themeId);
		expect(settings.mode).toBe(DEFAULT_SETTINGS.mode);
		expect(settings.blur).toBe(60);
		expect(settings.padding).toBe(DEFAULT_SETTINGS.padding);
		expect(settings.exportScale).toBe(DEFAULT_SETTINGS.exportScale);
		expect(settings.lineNumbers).toBe(false);
	});

	it("keeps valid stored values", () => {
		const settings = sanitizeSettings(
			{
				language: "go",
				mode: "dark",
				padding: 128,
				code: "a\tb",
				windowWidth: 700.6,
			},
			KNOWN,
		);
		expect(settings).toMatchObject({
			windowWidth: 701,
			language: "go",
			mode: "dark",
			padding: 128,
			code: "a  b",
		});
	});

	it("returns defaults for non-objects", () => {
		expect(sanitizeSettings(null, KNOWN)).toBe(DEFAULT_SETTINGS);
	});
});

describe("helpers", () => {
	it("parses 3, 6 and 8 digit hex colors", () => {
		expect(parseHexColor("#fff")).toEqual({ r: 255, g: 255, b: 255 });
		expect(parseHexColor("#1e1e2e")).toEqual({ r: 30, g: 30, b: 46 });
		expect(parseHexColor("#dbd7caee")).toEqual({ r: 219, g: 215, b: 202 });
		expect(rgba("#000", 0.5)).toBe("rgba(0, 0, 0, 0.5)");
	});

	it("snaps a dragged width back to auto at the content width", () => {
		expect(resolveWindowWidth(500, 520)).toBeNull();
		expect(resolveWindowWidth(640.4, 520)).toBe(640);
		expect(resolveWindowWidth(9000, 520)).toBe(1600);
	});

	it("normalizes line endings and tabs", () => {
		expect(normalizeCode("a\r\n\tb\rc")).toBe("a\n  b\nc");
	});

	it("caps the export scale for very large frames", () => {
		expect(effectiveExportScale({ width: 800, height: 600 }, 4)).toBe(4);
		expect(effectiveExportScale({ width: 6000, height: 6000 }, 4)).toBeLessThan(
			4,
		);
	});

	it("builds a file name from the title", () => {
		expect(exportFileName("snippet.ts")).toBe("snippet.png");
		expect(exportFileName("My Cool File")).toBe("my-cool-file.png");
		expect(exportFileName("")).toBe("code-image.png");
	});
});
