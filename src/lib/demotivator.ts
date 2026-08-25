export type TextLayer = {
	id: string;
	text: string;
	scale: number;
};

export type DemotivatorFrame = {
	id: string;
	layers: Array<TextLayer>;
};

export type MeasureText = (text: string, fontPx: number) => number;

export type LayerMetrics = {
	layerId: string;
	fontPx: number;
	lines: Array<string>;
	top: number;
};

export type FrameMetrics = {
	width: number;
	height: number;
	pad: number;
	imageX: number;
	imageY: number;
	borderGap: number;
	borderWidth: number;
	textLayers: Array<LayerMetrics>;
};

export const MIN_TEXT_SCALE = 0.03;
export const MAX_TEXT_SCALE = 0.16;
export const CAPTION_SCALE = 0.085;
export const SUBCAPTION_SCALE = 0.045;
export const MAX_SOURCE_SIZE = 1000;

export function wrapLines(
	text: string,
	fontPx: number,
	maxWidth: number,
	measure: MeasureText,
): Array<string> {
	const words = text.trim().split(/\s+/).filter(Boolean);
	if (words.length === 0) return [];
	const lines: Array<string> = [];
	let current = words[0];
	for (const word of words.slice(1)) {
		const candidate = `${current} ${word}`;
		if (measure(candidate, fontPx) <= maxWidth) {
			current = candidate;
		} else {
			lines.push(current);
			current = word;
		}
	}
	lines.push(current);
	return lines;
}

export function frameMetrics(
	innerW: number,
	innerH: number,
	layers: Array<TextLayer>,
	measure: MeasureText,
): FrameMetrics {
	const pad = Math.round(Math.min(Math.max(innerW * 0.085, 36), 150));
	const borderGap = Math.max(6, Math.round(innerW * 0.008));
	const borderWidth = Math.max(2, Math.round(innerW * 0.0025));
	const width = innerW + pad * 2;
	const imageX = pad;
	const imageY = pad;

	let cursor = innerH + pad + Math.round(pad * 0.5);
	const textLayers: Array<LayerMetrics> = [];
	for (const layer of layers) {
		const fontPx = Math.round(innerW * layer.scale);
		const lines = wrapLines(layer.text, fontPx, innerW + pad, measure);
		if (lines.length === 0) continue;
		textLayers.push({ layerId: layer.id, fontPx, lines, top: cursor });
		cursor += Math.round(fontPx * 1.25) * lines.length;
		cursor += Math.round(fontPx * 0.2);
	}
	const height = cursor + Math.round(pad * 0.6);
	return {
		width,
		height,
		pad,
		imageX,
		imageY,
		borderGap,
		borderWidth,
		textLayers,
	};
}

export const DEMOTIVATOR_FONT = '"Times New Roman", Georgia, serif';

function paintFrame(
	inner: HTMLCanvasElement | HTMLImageElement,
	innerW: number,
	innerH: number,
	frame: DemotivatorFrame,
): HTMLCanvasElement {
	const scratch = document.createElement("canvas");
	const scratchCtx = scratch.getContext("2d");
	if (!scratchCtx) throw new Error("Canvas is not available");
	const measure: MeasureText = (text, fontPx) => {
		scratchCtx.font = `${fontPx}px ${DEMOTIVATOR_FONT}`;
		return scratchCtx.measureText(text).width;
	};
	const metrics = frameMetrics(innerW, innerH, frame.layers, measure);

	const canvas = document.createElement("canvas");
	canvas.width = metrics.width;
	canvas.height = metrics.height;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Canvas is not available");

	ctx.fillStyle = "#000000";
	ctx.fillRect(0, 0, metrics.width, metrics.height);
	ctx.drawImage(inner, metrics.imageX, metrics.imageY, innerW, innerH);
	ctx.strokeStyle = "#ffffff";
	ctx.lineWidth = metrics.borderWidth;
	const inset = metrics.borderGap + metrics.borderWidth / 2;
	ctx.strokeRect(
		metrics.imageX - inset,
		metrics.imageY - inset,
		innerW + inset * 2,
		innerH + inset * 2,
	);

	ctx.fillStyle = "#ffffff";
	ctx.textAlign = "center";
	ctx.textBaseline = "top";
	for (const layer of metrics.textLayers) {
		ctx.font = `${layer.fontPx}px ${DEMOTIVATOR_FONT}`;
		layer.lines.forEach((line, index) => {
			ctx.fillText(
				line,
				metrics.width / 2,
				layer.top + index * Math.round(layer.fontPx * 1.25),
			);
		});
	}
	return canvas;
}

export function renderDemotivator(
	image: HTMLImageElement,
	frames: Array<DemotivatorFrame>,
): HTMLCanvasElement {
	const ratio = Math.min(
		1,
		MAX_SOURCE_SIZE / Math.max(image.naturalWidth, image.naturalHeight),
	);
	let width = Math.max(1, Math.round(image.naturalWidth * ratio));
	let height = Math.max(1, Math.round(image.naturalHeight * ratio));
	let canvas: HTMLCanvasElement | HTMLImageElement = image;
	if (frames.length === 0) {
		const flat = document.createElement("canvas");
		flat.width = width;
		flat.height = height;
		flat.getContext("2d")?.drawImage(image, 0, 0, width, height);
		return flat;
	}
	for (const frame of frames) {
		canvas = paintFrame(canvas, width, height, frame);
		width = canvas.width;
		height = canvas.height;
	}
	return canvas as HTMLCanvasElement;
}
