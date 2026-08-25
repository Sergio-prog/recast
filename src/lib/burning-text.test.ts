import { describe, expect, it } from "vitest";
import {
	buildFirePalette,
	createFireSim,
	FIRE_PALETTE,
	paintFire,
	stepFire,
} from "./burning-text";

describe("buildFirePalette", () => {
	it("produces 256 colors from black to white", () => {
		const palette = buildFirePalette();
		expect(palette).toHaveLength(256);
		expect(palette[0]).toEqual([0, 0, 0]);
		expect(palette[255]).toEqual([255, 255, 255]);
	});

	it("gets monotonically brighter", () => {
		const luma = (c: [number, number, number]) => c[0] + c[1] + c[2];
		for (let i = 1; i < 256; i++) {
			expect(luma(FIRE_PALETTE[i])).toBeGreaterThanOrEqual(
				luma(FIRE_PALETTE[i - 1]),
			);
		}
	});
});

const empty = (size: number) => new Uint8Array(size);

describe("stepFire", () => {
	const zero = () => 0;

	it("fills the glyph interior with fire-range heat", () => {
		const width = 6;
		const height = 6;
		const mask = empty(width * height);
		mask[4 * width + 2] = 1;
		const sim = createFireSim(mask, empty(width * height), width, height);
		stepFire(sim, 5, () => 0.5);
		const value = sim.heat[4 * width + 2];
		expect(value).toBeGreaterThanOrEqual(140);
		expect(value).toBeLessThanOrEqual(235);
	});

	it("keeps the outline dark red over the fill", () => {
		const width = 6;
		const height = 6;
		const mask = empty(width * height);
		const outline = empty(width * height);
		mask[4 * width + 2] = 1;
		outline[4 * width + 2] = 1;
		const sim = createFireSim(mask, outline, width, height);
		stepFire(sim, 5, () => 0.5);
		const value = sim.heat[4 * width + 2];
		expect(value).toBeGreaterThanOrEqual(52);
		expect(value).toBeLessThanOrEqual(74);
	});

	it("propagates heat upward over steps", () => {
		const width = 4;
		const height = 4;
		const mask = empty(width * height);
		mask[3 * width + 2] = 1;
		const sim = createFireSim(mask, empty(width * height), width, height);
		stepFire(sim, 1, zero);
		stepFire(sim, 1, zero);
		const rowAbove = Array.from(sim.heat.slice(2 * width, 3 * width));
		expect(Math.max(...rowAbove)).toBeGreaterThan(0);
	});

	it("cools to nothing without a source", () => {
		const width = 4;
		const height = 4;
		const sim = createFireSim(
			empty(width * height),
			empty(width * height),
			width,
			height,
		);
		stepFire(sim, 10, () => 0.9);
		expect(Array.from(sim.heat).every((h) => h === 0)).toBe(true);
	});
});

describe("paintFire", () => {
	it("renders faint cells as transparent and hot cells opaque", () => {
		const width = 2;
		const height = 1;
		const sim = createFireSim(empty(2), empty(2), width, height);
		sim.heat[0] = 5;
		sim.heat[1] = 200;
		const rgba = new Uint8ClampedArray(width * height * 4);
		paintFire(sim, rgba);
		expect(rgba[3]).toBe(0);
		expect(rgba[7]).toBe(255);
		expect(rgba[4]).toBeGreaterThan(200);
	});
});
