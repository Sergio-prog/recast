type GradientBlob = { x: number; y: number; radius: number; color: string };

export type BackgroundPreset = {
	id: string;
	label: string;
	base: string;
	blobs: Array<GradientBlob>;
};

export const BACKGROUND_NONE = "none";
export const BACKGROUND_CUSTOM = "custom";

export const BACKGROUND_PRESETS: Array<BackgroundPreset> = [
	{
		id: "meadow",
		label: "Meadow",
		base: "#b9d68a",
		blobs: [
			{ x: 0.1, y: 0.15, radius: 0.7, color: "#5f9e57" },
			{ x: 0.9, y: 0.1, radius: 0.55, color: "#f4f0b5" },
			{ x: 0.8, y: 0.9, radius: 0.7, color: "#2f7358" },
			{ x: 0.15, y: 0.95, radius: 0.55, color: "#9bd3b0" },
			{ x: 0.5, y: 0.45, radius: 0.3, color: "#fdfbe0" },
		],
	},
	{
		id: "dusk",
		label: "Dusk",
		base: "#2b1d4f",
		blobs: [
			{ x: 0.05, y: 0.1, radius: 0.75, color: "#ff7a59" },
			{ x: 0.95, y: 0.2, radius: 0.6, color: "#c9379d" },
			{ x: 0.6, y: 1, radius: 0.75, color: "#1b2a6b" },
			{ x: 0.05, y: 0.95, radius: 0.5, color: "#5b2a86" },
		],
	},
	{
		id: "lagoon",
		label: "Lagoon",
		base: "#0e7490",
		blobs: [
			{ x: 0.15, y: 0.15, radius: 0.65, color: "#7be3f4" },
			{ x: 0.9, y: 0.3, radius: 0.6, color: "#2563eb" },
			{ x: 0.45, y: 0.95, radius: 0.65, color: "#0f766e" },
			{ x: 0.95, y: 0.95, radius: 0.4, color: "#a7f3d0" },
		],
	},
	{
		id: "peach",
		label: "Peach",
		base: "#ffd8c2",
		blobs: [
			{ x: 0.1, y: 0.1, radius: 0.65, color: "#ff9a8b" },
			{ x: 0.95, y: 0.05, radius: 0.55, color: "#ffe29a" },
			{ x: 0.85, y: 0.95, radius: 0.65, color: "#ff6f91" },
			{ x: 0.1, y: 0.95, radius: 0.5, color: "#ffc3a0" },
		],
	},
	{
		id: "orchid",
		label: "Orchid",
		base: "#d9c7ff",
		blobs: [
			{ x: 0.15, y: 0.1, radius: 0.65, color: "#8e7dff" },
			{ x: 0.95, y: 0.25, radius: 0.55, color: "#ff9de2" },
			{ x: 0.7, y: 0.95, radius: 0.65, color: "#6ec3ff" },
			{ x: 0.05, y: 0.9, radius: 0.5, color: "#f3e8ff" },
		],
	},
	{
		id: "ember",
		label: "Ember",
		base: "#1a0f0a",
		blobs: [
			{ x: 0.15, y: 0.9, radius: 0.75, color: "#ff4d00" },
			{ x: 0.9, y: 0.95, radius: 0.5, color: "#ffb000" },
			{ x: 0.85, y: 0.05, radius: 0.6, color: "#5a1a0a" },
			{ x: 0.1, y: 0.05, radius: 0.5, color: "#2a1510" },
		],
	},
	{
		id: "graphite",
		label: "Graphite",
		base: "#1c1d22",
		blobs: [
			{ x: 0.15, y: 0.05, radius: 0.75, color: "#3d4150" },
			{ x: 0.95, y: 0.95, radius: 0.7, color: "#0b0c0f" },
			{ x: 0.9, y: 0.1, radius: 0.4, color: "#5a5f75" },
		],
	},
	{
		id: "paper",
		label: "Paper",
		base: "#e9e7e0",
		blobs: [
			{ x: 0.1, y: 0.05, radius: 0.65, color: "#ffffff" },
			{ x: 0.95, y: 0.95, radius: 0.75, color: "#cfccc2" },
			{ x: 0.9, y: 0.05, radius: 0.4, color: "#f7f5ef" },
		],
	},
];

export type Background = {
	id: string;
	label: string;
	source: HTMLCanvasElement;
	url: string;
};

const FULL_SIZE = 1400;
const THUMB_SIZE = 96;
const GRAIN_TILE = 128;
const GRAIN_ALPHA = 0.045;
const MAX_UPLOAD_SIDE = 2560;

const transparent = (hex: string) => `${hex}00`;

function grainTile(): HTMLCanvasElement {
	const tile = document.createElement("canvas");
	tile.width = GRAIN_TILE;
	tile.height = GRAIN_TILE;
	const ctx = tile.getContext("2d");
	if (!ctx) return tile;
	const image = ctx.createImageData(GRAIN_TILE, GRAIN_TILE);
	let seed = 0x2f6e2b1;
	for (let i = 0; i < image.data.length; i += 4) {
		seed = (seed * 1664525 + 1013904223) >>> 0;
		const value = seed >>> 24;
		image.data[i] = value;
		image.data[i + 1] = value;
		image.data[i + 2] = value;
		image.data[i + 3] = 255;
	}
	ctx.putImageData(image, 0, 0);
	return tile;
}

function paintPreset(preset: BackgroundPreset, size: number, grain: boolean) {
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d");
	if (!ctx) return canvas;
	ctx.fillStyle = preset.base;
	ctx.fillRect(0, 0, size, size);
	for (const blob of preset.blobs) {
		const gradient = ctx.createRadialGradient(
			blob.x * size,
			blob.y * size,
			0,
			blob.x * size,
			blob.y * size,
			blob.radius * size,
		);
		gradient.addColorStop(0, blob.color);
		gradient.addColorStop(1, transparent(blob.color));
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, size, size);
	}
	if (grain) {
		const pattern = ctx.createPattern(grainTile(), "repeat");
		if (pattern) {
			ctx.globalAlpha = GRAIN_ALPHA;
			ctx.globalCompositeOperation = "overlay";
			ctx.fillStyle = pattern;
			ctx.fillRect(0, 0, size, size);
		}
	}
	return canvas;
}

const presetCache = new Map<string, Background>();
const thumbCache = new Map<string, string>();

export function getPresetBackground(id: string): Background | null {
	const preset = BACKGROUND_PRESETS.find((entry) => entry.id === id);
	if (!preset) return null;
	let background = presetCache.get(id);
	if (!background) {
		const source = paintPreset(preset, FULL_SIZE, true);
		background = {
			id,
			label: preset.label,
			source,
			url: source.toDataURL("image/jpeg", 0.92),
		};
		presetCache.set(id, background);
	}
	return background;
}

export function getPresetThumb(id: string): string | null {
	const preset = BACKGROUND_PRESETS.find((entry) => entry.id === id);
	if (!preset) return null;
	let thumb = thumbCache.get(id);
	if (!thumb) {
		thumb = paintPreset(preset, THUMB_SIZE, false).toDataURL("image/png");
		thumbCache.set(id, thumb);
	}
	return thumb;
}

export async function loadCustomBackground(file: File): Promise<Background> {
	const bitmap = await createImageBitmap(file);
	const scale = Math.min(
		1,
		MAX_UPLOAD_SIDE / Math.max(bitmap.width, bitmap.height),
	);
	const source = document.createElement("canvas");
	source.width = Math.max(1, Math.round(bitmap.width * scale));
	source.height = Math.max(1, Math.round(bitmap.height * scale));
	const ctx = source.getContext("2d");
	if (!ctx) throw new Error("Canvas is not available");
	ctx.imageSmoothingQuality = "high";
	ctx.drawImage(bitmap, 0, 0, source.width, source.height);
	bitmap.close();
	const blob = await new Promise<Blob | null>((resolve) =>
		source.toBlob(resolve, "image/jpeg", 0.92),
	);
	if (!blob) throw new Error("Image could not be encoded");
	return {
		id: BACKGROUND_CUSTOM,
		label: file.name,
		source,
		url: URL.createObjectURL(blob),
	};
}
