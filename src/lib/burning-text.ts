import { GIFEncoder } from "gifenc";

const PALETTE_STOPS: Array<[number, [number, number, number]]> = [
	[0, [0, 0, 0]],
	[0.16, [46, 7, 2]],
	[0.35, [122, 20, 0]],
	[0.52, [200, 60, 0]],
	[0.68, [240, 128, 10]],
	[0.83, [255, 195, 40]],
	[0.94, [255, 240, 168]],
	[1, [255, 255, 255]],
];

export function buildFirePalette(): Array<[number, number, number]> {
	const palette: Array<[number, number, number]> = [];
	for (let i = 0; i < 256; i++) {
		const t = i / 255;
		let hi = PALETTE_STOPS.length - 1;
		while (PALETTE_STOPS[hi - 1][0] > t) hi--;
		const [t0, c0] = PALETTE_STOPS[hi - 1];
		const [t1, c1] = PALETTE_STOPS[hi];
		const mix = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
		palette.push([
			Math.round(c0[0] + (c1[0] - c0[0]) * mix),
			Math.round(c0[1] + (c1[1] - c0[1]) * mix),
			Math.round(c0[2] + (c1[2] - c0[2]) * mix),
		]);
	}
	return palette;
}

export const FIRE_PALETTE = buildFirePalette();

export type FireSim = {
	width: number;
	height: number;
	heat: Uint8Array;
	mask: Uint8Array;
};

export function createFireSim(
	mask: Uint8Array,
	width: number,
	height: number,
): FireSim {
	return { width, height, heat: new Uint8Array(width * height), mask };
}

export function stepFire(
	sim: FireSim,
	cooling: number,
	random: () => number = Math.random,
): void {
	const { width, height, heat, mask } = sim;
	for (let y = 0; y < height - 1; y++) {
		const row = y * width;
		const below = (y + 1) * width;
		for (let x = 0; x < width; x++) {
			const drift = x + ((random() * 3) | 0) - 1;
			const sx = drift < 0 ? 0 : drift >= width ? width - 1 : drift;
			const src = heat[below + sx];
			const decay = (random() * cooling) | 0;
			heat[row + x] = src > decay ? src - decay : 0;
		}
	}
	for (let i = 0; i < mask.length; i++) {
		if (mask[i]) heat[i] = 230 + ((random() * 26) | 0);
	}
}

export function paintFire(sim: FireSim, rgba: Uint8ClampedArray): void {
	const { heat } = sim;
	for (let i = 0; i < heat.length; i++) {
		const [r, g, b] = FIRE_PALETTE[heat[i]];
		const o = i * 4;
		rgba[o] = r;
		rgba[o + 1] = g;
		rgba[o + 2] = b;
		rgba[o + 3] = 255;
	}
}

export const FIRE_FONT = '"Arial Black", "Arial Bold", Arial, sans-serif';

export function textMask(
	text: string,
	maxWidth = 920,
): { mask: Uint8Array; width: number; height: number } {
	const probe = document.createElement("canvas").getContext("2d");
	if (!probe) throw new Error("Canvas is not available");
	let fontPx = 110;
	probe.font = `900 ${fontPx}px ${FIRE_FONT}`;
	const rawWidth = Math.max(1, probe.measureText(text).width);
	if (rawWidth + 80 > maxWidth) {
		fontPx = Math.max(28, Math.floor((fontPx * (maxWidth - 80)) / rawWidth));
	}

	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Canvas is not available");
	ctx.font = `900 ${fontPx}px ${FIRE_FONT}`;
	const width = Math.min(
		maxWidth,
		Math.ceil(ctx.measureText(text).width + 80),
	);
	const height = Math.ceil(fontPx * 1.2 + fontPx * 1.3);
	canvas.width = width;
	canvas.height = height;
	ctx.font = `900 ${fontPx}px ${FIRE_FONT}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "alphabetic";
	ctx.fillStyle = "#ffffff";
	ctx.fillText(text, width / 2, height - Math.round(fontPx * 0.32), width - 40);

	const { data } = ctx.getImageData(0, 0, width, height);
	const mask = new Uint8Array(width * height);
	for (let i = 0; i < mask.length; i++) {
		if (data[i * 4 + 3] > 128) mask[i] = 1;
	}
	return { mask, width, height };
}

export function encodeFireGif(
	sim: FireSim,
	cooling: number,
	frames = 40,
	delay = 60,
): Uint8Array {
	const gif = GIFEncoder();
	for (let i = 0; i < 30; i++) stepFire(sim, cooling);
	for (let frame = 0; frame < frames; frame++) {
		stepFire(sim, cooling);
		stepFire(sim, cooling);
		gif.writeFrame(sim.heat.slice(), sim.width, sim.height, {
			palette: FIRE_PALETTE,
			delay,
		});
	}
	gif.finish();
	return gif.bytes();
}
