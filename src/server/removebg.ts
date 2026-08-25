import sharp from "sharp";

export const MIN_TOLERANCE = 5;
export const MAX_TOLERANCE = 120;
export const DEFAULT_TOLERANCE = 32;

function estimateBackground(
	rgba: Uint8Array | Uint8ClampedArray,
	width: number,
	height: number,
): [number, number, number] {
	const bins = new Map<number, { count: number; r: number; g: number; b: number }>();
	const visit = (x: number, y: number) => {
		const o = (y * width + x) * 4;
		const key =
			((rgba[o] >> 4) << 8) | ((rgba[o + 1] >> 4) << 4) | (rgba[o + 2] >> 4);
		const bin = bins.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
		bin.count += 1;
		bin.r += rgba[o];
		bin.g += rgba[o + 1];
		bin.b += rgba[o + 2];
		bins.set(key, bin);
	};
	for (let x = 0; x < width; x++) {
		visit(x, 0);
		visit(x, height - 1);
	}
	for (let y = 1; y < height - 1; y++) {
		visit(0, y);
		visit(width - 1, y);
	}
	let best = { count: 0, r: 0, g: 0, b: 0 };
	for (const bin of bins.values()) {
		if (bin.count > best.count) best = bin;
	}
	if (best.count === 0) return [255, 255, 255];
	return [
		Math.round(best.r / best.count),
		Math.round(best.g / best.count),
		Math.round(best.b / best.count),
	];
}

export function backgroundMask(
	rgba: Uint8Array | Uint8ClampedArray,
	width: number,
	height: number,
	tolerance: number,
): Uint8Array {
	const [br, bg, bb] = estimateBackground(rgba, width, height);
	const limit = 3 * tolerance * tolerance;
	const isBackground = (index: number) => {
		const o = index * 4;
		const dr = rgba[o] - br;
		const dg = rgba[o + 1] - bg;
		const db = rgba[o + 2] - bb;
		return dr * dr + dg * dg + db * db <= limit;
	};

	const mask = new Uint8Array(width * height);
	const queue: Array<number> = [];
	const push = (index: number) => {
		if (!mask[index] && isBackground(index)) {
			mask[index] = 1;
			queue.push(index);
		}
	};
	for (let x = 0; x < width; x++) {
		push(x);
		push((height - 1) * width + x);
	}
	for (let y = 1; y < height - 1; y++) {
		push(y * width);
		push(y * width + width - 1);
	}
	while (queue.length > 0) {
		const index = queue.pop() as number;
		const x = index % width;
		if (x > 0) push(index - 1);
		if (x < width - 1) push(index + 1);
		if (index >= width) push(index - width);
		if (index < width * (height - 1)) push(index + width);
	}
	return mask;
}

export function featherAlpha(
	mask: Uint8Array,
	width: number,
	height: number,
): Uint8Array {
	const alpha = new Uint8Array(width * height);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const index = y * width + x;
			if (mask[index]) continue;
			let backgroundNeighbors = 0;
			let neighbors = 0;
			for (let dy = -1; dy <= 1; dy++) {
				for (let dx = -1; dx <= 1; dx++) {
					const nx = x + dx;
					const ny = y + dy;
					if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
					neighbors += 1;
					if (mask[ny * width + nx]) backgroundNeighbors += 1;
				}
			}
			alpha[index] = Math.round(255 * (1 - backgroundNeighbors / neighbors));
		}
	}
	return alpha;
}

export function applyBackgroundMask(
	rgba: Uint8Array | Uint8ClampedArray,
	width: number,
	height: number,
	tolerance: number,
): void {
	const mask = backgroundMask(rgba, width, height, tolerance);
	const alpha = featherAlpha(mask, width, height);
	for (let i = 0; i < mask.length; i++) {
		const o = i * 4 + 3;
		rgba[o] = Math.min(rgba[o], alpha[i]);
	}
}

export async function removeBackground(
	input: Buffer,
	tolerance: number,
): Promise<Buffer> {
	const { data, info } = await sharp(input, { limitInputPixels: 500_000_000 })
		.rotate()
		.resize({
			width: 2000,
			height: 2000,
			fit: "inside",
			withoutEnlargement: true,
		})
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	applyBackgroundMask(data, info.width, info.height, tolerance);
	return sharp(data, {
		raw: { width: info.width, height: info.height, channels: 4 },
	})
		.png()
		.toBuffer();
}
