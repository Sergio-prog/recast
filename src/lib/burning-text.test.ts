import { describe, expect, it } from "vitest";
import {
	buildFirePalette,
	createFireSim,
	FIRE_PALETTE,
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

describe("stepFire", () => {
	const zero = () => 0;

	it("stamps the text mask at full heat", () => {
		const width = 4;
		const height = 4;
		const mask = new Uint8Array(width * height);
		mask[3 * width + 1] = 1;
		const sim = createFireSim(mask, width, height);
		stepFire(sim, 5, zero);
		expect(sim.heat[3 * width + 1]).toBe(230);
	});

	it("propagates heat upward over steps", () => {
		const width = 4;
		const height = 4;
		const mask = new Uint8Array(width * height);
		mask[3 * width + 2] = 1;
		const sim = createFireSim(mask, width, height);
		stepFire(sim, 1, zero);
		stepFire(sim, 1, zero);
		const rowAbove = Array.from(sim.heat.slice(2 * width, 3 * width));
		expect(Math.max(...rowAbove)).toBeGreaterThan(0);
	});

	it("cools to nothing far from the source", () => {
		const width = 4;
		const height = 4;
		const sim = createFireSim(new Uint8Array(width * height), width, height);
		stepFire(sim, 10, () => 0.9);
		expect(Array.from(sim.heat).every((h) => h === 0)).toBe(true);
	});
});
