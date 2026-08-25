import { describe, expect, it } from "vitest";
import { frameMetrics, type MeasureText, wrapLines } from "./demotivator";

const measure: MeasureText = (text, fontPx) => text.length * fontPx * 0.5;

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
		for (const line of lines.slice(0, -1)) {
			expect(measure(line, 20)).toBeLessThanOrEqual(90);
		}
	});

	it("keeps an overlong single word on its own line", () => {
		expect(wrapLines("incomprehensibilities", 20, 50, measure)).toEqual([
			"incomprehensibilities",
		]);
	});
});

describe("frameMetrics", () => {
	const layers = [
		{ id: "a", text: "CAPTION", scale: 0.085 },
		{ id: "b", text: "smaller subcaption", scale: 0.045 },
	];

	it("centers the image with equal padding", () => {
		const m = frameMetrics(800, 600, layers, measure);
		expect(m.imageX).toBe(m.pad);
		expect(m.imageY).toBe(m.pad);
		expect(m.width).toBe(800 + m.pad * 2);
	});

	it("stacks text layers below the image in order", () => {
		const m = frameMetrics(800, 600, layers, measure);
		expect(m.textLayers).toHaveLength(2);
		expect(m.textLayers[0].top).toBeGreaterThan(600 + m.pad);
		expect(m.textLayers[1].top).toBeGreaterThan(m.textLayers[0].top);
		expect(m.textLayers[0].fontPx).toBe(Math.round(800 * 0.085));
	});

	it("skips empty layers and still closes the frame", () => {
		const m = frameMetrics(800, 600, [{ id: "a", text: " ", scale: 0.1 }], measure);
		expect(m.textLayers).toHaveLength(0);
		expect(m.height).toBeGreaterThan(600 + m.pad);
	});

	it("grows the frame height with wrapped lines", () => {
		const short = frameMetrics(400, 300, [layers[0]], measure);
		const long = frameMetrics(
			400,
			300,
			[{ id: "a", text: "many words that will surely wrap over lines", scale: 0.085 }],
			measure,
		);
		expect(long.height).toBeGreaterThan(short.height);
	});
});
