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

const VISIBLE_HEAT = 24;
const NOISE_CELL = 3;

export type FireSim = {
	width: number;
	height: number;
	heat: Uint8Array;
	mask: Uint8Array;
	outline: Uint8Array;
	noise: Uint8Array;
	noiseWidth: number;
};

export function createFireSim(
	mask: Uint8Array,
	outline: Uint8Array,
	width: number,
	height: number,
): FireSim {
	const noiseWidth = Math.ceil(width / NOISE_CELL);
	const noiseHeight = Math.ceil(height / NOISE_CELL);
	return {
		width,
		height,
		heat: new Uint8Array(width * height),
		mask,
		outline,
		noise: new Uint8Array(noiseWidth * noiseHeight),
		noiseWidth,
	};
}

export function stepFire(
	sim: FireSim,
	cooling: number,
	random: () => number = Math.random,
): void {
	const { width, height, heat, mask, outline, noise, noiseWidth } = sim;
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
	for (let i = 0; i < noise.length; i++) {
		noise[i] = (random() * 95) | 0;
	}
	for (let y = 0; y < height; y++) {
		const noiseRow = ((y / NOISE_CELL) | 0) * noiseWidth;
		for (let x = 0; x < width; x++) {
			const i = y * width + x;
			if (mask[i]) {
				heat[i] = 140 + noise[noiseRow + ((x / NOISE_CELL) | 0)];
			}
			if (outline[i]) {
				heat[i] = 52 + ((random() * 22) | 0);
			}
		}
	}
}

export function paintFire(sim: FireSim, rgba: Uint8ClampedArray): void {
	const { heat } = sim;
	for (let i = 0; i < heat.length; i++) {
		const o = i * 4;
		const value = heat[i];
		if (value < VISIBLE_HEAT) {
			rgba[o + 3] = 0;
			continue;
		}
		const [r, g, b] = FIRE_PALETTE[value];
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
): {
	mask: Uint8Array;
	outline: Uint8Array;
	width: number;
	height: number;
} {
	const probe = document.createElement("canvas").getContext("2d");
	if (!probe) throw new Error("Canvas is not available");
	let fontPx = 110;
	probe.font = `900 ${fontPx}px ${FIRE_FONT}`;
	const rawWidth = Math.max(1, probe.measureText(text).width);
	if (rawWidth + 60 > maxWidth) {
		fontPx = Math.max(28, Math.floor((fontPx * (maxWidth - 60)) / rawWidth));
	}

	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Canvas is not available");
	ctx.font = `900 ${fontPx}px ${FIRE_FONT}`;
	const width = Math.min(maxWidth, Math.ceil(ctx.measureText(text).width + 60));
	const height = Math.ceil(fontPx * 1.2 + fontPx * 0.85);
	canvas.width = width;
	canvas.height = height;
	ctx.font = `900 ${fontPx}px ${FIRE_FONT}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "alphabetic";
	const baseline = height - Math.round(fontPx * 0.28);
	ctx.fillStyle = "#ffffff";
	ctx.fillText(text, width / 2, baseline, width - 30);
	const fillData = ctx.getImageData(0, 0, width, height).data;

	ctx.clearRect(0, 0, width, height);
	ctx.strokeStyle = "#ffffff";
	ctx.lineWidth = Math.max(2, Math.round(fontPx * 0.045));
	ctx.strokeText(text, width / 2, baseline, width - 30);
	const strokeData = ctx.getImageData(0, 0, width, height).data;

	const mask = new Uint8Array(width * height);
	const outline = new Uint8Array(width * height);
	for (let i = 0; i < mask.length; i++) {
		if (fillData[i * 4 + 3] > 128) mask[i] = 1;
		if (strokeData[i * 4 + 3] > 128) outline[i] = 1;
	}
	return { mask, outline, width, height };
}

export function encodeFireGif(
	sim: FireSim,
	cooling: number,
	frames = 40,
	delay = 60,
): Uint8Array {
	const gif = GIFEncoder();
	const index = new Uint8Array(sim.width * sim.height);
	for (let i = 0; i < 20; i++) stepFire(sim, cooling);
	for (let frame = 0; frame < frames; frame++) {
		stepFire(sim, cooling);
		stepFire(sim, cooling);
		for (let i = 0; i < index.length; i++) {
			index[i] = sim.heat[i] < VISIBLE_HEAT ? 0 : sim.heat[i];
		}
		gif.writeFrame(index, sim.width, sim.height, {
			palette: FIRE_PALETTE,
			delay,
			transparent: true,
			transparentIndex: 0,
			dispose: 2,
		});
	}
	gif.finish();
	return gif.bytes();
}
