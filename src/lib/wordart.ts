type FillStop = [number, string];

type Distortion = {
	kind: "arch" | "wave" | "bulge" | "slant";
	amount: number;
};

export type WordArtStyle = {
	id: string;
	label: string;
	italic?: boolean;
	fillStops: Array<FillStop>;
	fillDirection: "horizontal" | "vertical";
	stroke?: { color: string; width: number };
	extrude?: { dx: number; dy: number; depth: number; color: string };
	distort?: Distortion;
};

export const WORDART_STYLES: Array<WordArtStyle> = [
	{
		id: "rainbow-arch",
		label: "Rainbow arch",
		fillDirection: "horizontal",
		fillStops: [
			[0, "#e5342c"],
			[0.2, "#f28a1f"],
			[0.4, "#f2d020"],
			[0.6, "#3faf4b"],
			[0.8, "#2f6fd0"],
			[1, "#8b3fc4"],
		],
		stroke: { color: "#1c1c1c", width: 0.022 },
		distort: { kind: "arch", amount: 0.22 },
	},
	{
		id: "blue-chrome",
		label: "Blue chrome",
		fillDirection: "vertical",
		fillStops: [
			[0, "#9cc7f2"],
			[0.42, "#eef7ff"],
			[0.52, "#2f7fd6"],
			[1, "#0a3f7d"],
		],
		stroke: { color: "#0a3f7d", width: 0.02 },
		extrude: { dx: 1, dy: 1, depth: 6, color: "#9aa7b8" },
	},
	{
		id: "purple-block",
		label: "Purple block",
		fillDirection: "vertical",
		fillStops: [
			[0, "#d9bdf0"],
			[1, "#b18ae0"],
		],
		extrude: { dx: 1.4, dy: 1, depth: 14, color: "#5b2d8e" },
	},
	{
		id: "sunset-wave",
		label: "Sunset wave",
		fillDirection: "vertical",
		fillStops: [
			[0, "#f7e733"],
			[0.55, "#f2921d"],
			[1, "#d8341f"],
		],
		stroke: { color: "#6e1408", width: 0.018 },
		distort: { kind: "wave", amount: 0.14 },
	},
	{
		id: "gold-bulge",
		label: "Gold bulge",
		fillDirection: "vertical",
		fillStops: [
			[0, "#fff3b8"],
			[0.5, "#ecc037"],
			[1, "#96721c"],
		],
		stroke: { color: "#6b4f0f", width: 0.016 },
		extrude: { dx: 1, dy: 1.2, depth: 7, color: "#7d5e12" },
		distort: { kind: "bulge", amount: 0.28 },
	},
	{
		id: "mint-slant",
		label: "Mint slant",
		italic: true,
		fillDirection: "vertical",
		fillStops: [
			[0, "#7ee8cf"],
			[1, "#17b898"],
		],
		extrude: { dx: -1.2, dy: 1.1, depth: 10, color: "#0b5f4f" },
		distort: { kind: "slant", amount: 0.12 },
	},
];

export const WORDART_FONT = '"Arial Black", "Arial Bold", Arial, sans-serif';

function buildFill(
	ctx: CanvasRenderingContext2D,
	style: WordArtStyle,
	x: number,
	y: number,
	w: number,
	h: number,
): CanvasGradient {
	const gradient =
		style.fillDirection === "horizontal"
			? ctx.createLinearGradient(x, 0, x + w, 0)
			: ctx.createLinearGradient(0, y, 0, y + h);
	for (const [offset, color] of style.fillStops) {
		gradient.addColorStop(offset, color);
	}
	return gradient;
}

function paintFlat(
	text: string,
	style: WordArtStyle,
	fontPx: number,
): HTMLCanvasElement {
	const probe = document.createElement("canvas").getContext("2d");
	if (!probe) throw new Error("Canvas is not available");
	const font = `${style.italic ? "italic " : ""}900 ${fontPx}px ${WORDART_FONT}`;
	probe.font = font;
	const textWidth = Math.max(1, probe.measureText(text).width);

	const depth = style.extrude?.depth ?? 0;
	const strokeWidth = style.stroke ? style.stroke.width * fontPx : 0;
	const margin = Math.ceil(fontPx * 0.16 + strokeWidth + depth * 2);
	const canvas = document.createElement("canvas");
	canvas.width = Math.ceil(textWidth + margin * 2);
	canvas.height = Math.ceil(fontPx * 1.24 + margin * 2);
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Canvas is not available");

	ctx.font = font;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	const cx = canvas.width / 2;
	const cy = canvas.height / 2;

	if (style.extrude) {
		ctx.fillStyle = style.extrude.color;
		for (let i = style.extrude.depth; i >= 1; i--) {
			ctx.fillText(text, cx + style.extrude.dx * i, cy + style.extrude.dy * i);
		}
	}
	const glyphTop = cy - fontPx * 0.55;
	ctx.fillStyle = buildFill(
		ctx,
		style,
		cx - textWidth / 2,
		glyphTop,
		textWidth,
		fontPx * 1.1,
	);
	ctx.fillText(text, cx, cy);
	if (style.stroke) {
		ctx.strokeStyle = style.stroke.color;
		ctx.lineWidth = strokeWidth;
		ctx.lineJoin = "round";
		ctx.strokeText(text, cx, cy);
	}
	return canvas;
}

function columnShift(distort: Distortion, t: number, height: number): number {
	const a = distort.amount * height;
	switch (distort.kind) {
		case "arch":
			return -a * Math.sin(Math.PI * t);
		case "wave":
			return a * Math.sin(2 * Math.PI * t);
		case "slant":
			return a * (0.5 - t);
		case "bulge":
			return 0;
	}
}

function columnScale(distort: Distortion, t: number): number {
	if (distort.kind === "bulge") {
		return 1 + distort.amount * Math.sin(Math.PI * t);
	}
	return 1;
}

function distortCanvas(
	flat: HTMLCanvasElement,
	distort: Distortion,
): HTMLCanvasElement {
	const extra = Math.ceil(flat.height * (distort.amount + 0.05));
	const canvas = document.createElement("canvas");
	canvas.width = flat.width;
	canvas.height = flat.height + extra * 2;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Canvas is not available");
	for (let x = 0; x < flat.width; x++) {
		const t = x / flat.width;
		const scale = columnScale(distort, t);
		const height = flat.height * scale;
		const y = extra + columnShift(distort, t, flat.height) + (flat.height - height) / 2;
		ctx.drawImage(flat, x, 0, 1, flat.height, x, y, 1, height);
	}
	return canvas;
}

function trimTransparent(canvas: HTMLCanvasElement): HTMLCanvasElement {
	const ctx = canvas.getContext("2d");
	if (!ctx) return canvas;
	const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
	let top = canvas.height;
	let bottom = 0;
	let left = canvas.width;
	let right = 0;
	for (let y = 0; y < canvas.height; y++) {
		for (let x = 0; x < canvas.width; x++) {
			if (data[(y * canvas.width + x) * 4 + 3] > 0) {
				if (y < top) top = y;
				if (y > bottom) bottom = y;
				if (x < left) left = x;
				if (x > right) right = x;
			}
		}
	}
	if (top > bottom) return canvas;
	const pad = 12;
	const out = document.createElement("canvas");
	out.width = right - left + 1 + pad * 2;
	out.height = bottom - top + 1 + pad * 2;
	out
		.getContext("2d")
		?.drawImage(
			canvas,
			left,
			top,
			right - left + 1,
			bottom - top + 1,
			pad,
			pad,
			right - left + 1,
			bottom - top + 1,
		);
	return out;
}

export function renderWordArt(
	text: string,
	style: WordArtStyle,
	fontPx = 160,
): HTMLCanvasElement {
	const flat = paintFlat(text || " ", style, fontPx);
	const shaped = style.distort ? distortCanvas(flat, style.distort) : flat;
	return trimTransparent(shaped);
}
