import { describe, expect, it } from "vitest";
import {
	frameMetrics,
	type MeasureText,
	type MeasuredLine,
	measuredLines,
	wrapLines,
} from "./demotivator";

const measure: MeasureText = (text, fontPx) => text.length * fontPx * 0.5;

const line = (
	kind: "caption" | "subcaption",
	text: string,
	scale: number,
): MeasuredLine => ({ kind, text, scale, ghost: false });

describe("wrapLines", () => {
	it("returns no lines for empty text", () => {
		expect(wrapLines("   ", 40, 500, measure)).toEqual([]);
	});

	it("keeps short text on one line", () => {
		expect(wrapLines("hello world", 20, 500, measure)).toEqual(["hello world"]);
	});

	it("wraps words that exceed the max width", () => {
		const lines = wrapLines("one two three four", 20, 90, measure);
		expect(lines).toEqual(["one two", "three", "four"]);
		for (const row of lines.slice(0, -1)) {
			expect(measure(row, 20)).toBeLessThanOrEqual(90);
		}
	});

	it("keeps an overlong single word on its own line", () => {
		expect(wrapLines("incomprehensibilities", 20, 50, measure)).toEqual([
			"incomprehensibilities",
		]);
	});
});

describe("frameMetrics", () => {
	const lines = [
		line("caption", "CAPTION", 0.09),
		line("subcaption", "smaller subcaption", 0.035),
	];

	it("centers the image with equal padding", () => {
		const m = frameMetrics(800, 600, lines, measure);
		expect(m.imageX).toBe(m.pad);
		expect(m.imageY).toBe(m.pad);
		expect(m.width).toBe(800 + m.pad * 2);
	});

	it("stacks caption above subcaption below the image", () => {
		const m = frameMetrics(800, 600, lines, measure);
		expect(m.textLines).toHaveLength(2);
		expect(m.textLines[0].kind).toBe("caption");
		expect(m.textLines[0].top).toBeGreaterThan(600 + m.pad);
		expect(m.textLines[1].top).toBeGreaterThan(
			m.textLines[0].top + m.textLines[0].boxHeight - 1,
		);
		expect(m.textLines[0].fontPx).toBe(Math.round(800 * 0.09));
	});

	it("skips blank lines and still closes the frame", () => {
		const m = frameMetrics(800, 600, [line("caption", " ", 0.09)], measure);
		expect(m.textLines).toHaveLength(0);
		expect(m.height).toBeGreaterThan(600 + m.pad);
	});

	it("grows the frame height with wrapped lines", () => {
		const short = frameMetrics(400, 300, [lines[0]], measure);
		const long = frameMetrics(
			400,
			300,
			[line("caption", "many words that will surely wrap over lines", 0.09)],
			measure,
		);
		expect(long.height).toBeGreaterThan(short.height);
	});
});

describe("measuredLines", () => {
	const frame = {
		id: "f",
		caption: { text: "HELLO", scale: 0.09 },
		subcaption: { text: "", scale: 0.035 },
	};

	it("drops empty lines when placeholders are off", () => {
		const lines = measuredLines(frame, false);
		expect(lines).toHaveLength(1);
		expect(lines[0].kind).toBe("caption");
	});

	it("substitutes ghost placeholders when placeholders are on", () => {
		const lines = measuredLines(frame, true);
		expect(lines).toHaveLength(2);
		expect(lines[1].ghost).toBe(true);
		expect(lines[1].text).not.toBe("");
		expect(lines[0].ghost).toBe(false);
	});
});
