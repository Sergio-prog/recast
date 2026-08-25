import { describe, expect, it } from "vitest";
import {
	applyBackgroundMask,
	backgroundMask,
	featherAlpha,
} from "./removebg";

function solidImage(
	width: number,
	height: number,
	color: [number, number, number],
): Uint8Array {
	const rgba = new Uint8Array(width * height * 4);
	for (let i = 0; i < width * height; i++) {
		rgba.set([...color, 255], i * 4);
	}
	return rgba;
}

function paintRect(
	rgba: Uint8Array,
	width: number,
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	color: [number, number, number],
) {
	for (let y = y0; y <= y1; y++) {
		for (let x = x0; x <= x1; x++) {
			rgba.set([...color, 255], (y * width + x) * 4);
		}
	}
}

describe("backgroundMask", () => {
	it("marks a uniform border as background and keeps the subject", () => {
		const rgba = solidImage(10, 10, [250, 250, 250]);
		paintRect(rgba, 10, 3, 3, 6, 6, [200, 20, 20]);
		const mask = backgroundMask(rgba, 10, 10, 30);
		expect(mask[0]).toBe(1);
		expect(mask[5 * 10 + 5]).toBe(0);
	});

	it("does not eat enclosed holes that never touch the border", () => {
		const rgba = solidImage(12, 12, [255, 255, 255]);
		paintRect(rgba, 12, 2, 2, 9, 9, [10, 10, 200]);
		paintRect(rgba, 12, 5, 5, 6, 6, [255, 255, 255]);
		const mask = backgroundMask(rgba, 12, 12, 30);
		expect(mask[5 * 12 + 5]).toBe(0);
	});

	it("keeps a subject that touches the border", () => {
		const rgba = solidImage(10, 10, [240, 240, 240]);
		paintRect(rgba, 10, 4, 0, 6, 9, [30, 120, 30]);
		const mask = backgroundMask(rgba, 10, 10, 30);
		expect(mask[5]).toBe(0);
		expect(mask[3]).toBe(1);
	});

	it("respects the tolerance", () => {
		const rgba = solidImage(6, 6, [200, 200, 200]);
		paintRect(rgba, 6, 2, 2, 3, 3, [170, 170, 170]);
		expect(backgroundMask(rgba, 6, 6, 10)[2 * 6 + 2]).toBe(0);
		expect(backgroundMask(rgba, 6, 6, 60)[2 * 6 + 2]).toBe(1);
	});
});

describe("featherAlpha", () => {
	it("softens the edge between subject and background", () => {
		const mask = new Uint8Array(25).fill(1);
		for (let y = 1; y <= 3; y++) {
			for (let x = 1; x <= 3; x++) mask[y * 5 + x] = 0;
		}
		const alpha = featherAlpha(mask, 5, 5);
		expect(alpha[2 * 5 + 2]).toBe(255);
		expect(alpha[1 * 5 + 1]).toBeLessThan(255);
		expect(alpha[1 * 5 + 1]).toBeGreaterThan(0);
		expect(alpha[0]).toBe(0);
	});
});

describe("applyBackgroundMask", () => {
	it("clears alpha on the background only", () => {
		const rgba = solidImage(8, 8, [255, 255, 255]);
		paintRect(rgba, 8, 3, 3, 4, 4, [0, 0, 0]);
		applyBackgroundMask(rgba, 8, 8, 30);
		expect(rgba[3]).toBe(0);
		expect(rgba[(3 * 8 + 3) * 4 + 3]).toBeGreaterThan(0);
	});
});
