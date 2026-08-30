export type LineKind = "caption" | "subcaption";

export type DemotivatorFontId =
	| "classic"
	| "georgia"
	| "baskerville"
	| "palatino"
	| "arial"
	| "courier";

export type DemotivatorFont = {
	id: DemotivatorFontId;
	label: string;
	family: string;
};

export type DemotivatorLine = {
	text: string;
	scale: number;
};

export type DemotivatorFrame = {
	id: string;
	caption: DemotivatorLine;
	subcaption: DemotivatorLine;
};

export type MeasureText = (text: string, fontPx: number) => number;

export type MeasuredLine = {
	kind: LineKind;
	text: string;
	scale: number;
	ghost: boolean;
};

export type LineMetrics = {
	kind: LineKind;
	ghost: boolean;
	fontPx: number;
	lines: Array<string>;
	top: number;
	boxX: number;
	boxWidth: number;
	boxHeight: number;
};

export type FrameMetrics = {
	width: number;
	height: number;
	pad: number;
	imageX: number;
	imageY: number;
	borderGap: number;
	borderWidth: number;
	textLines: Array<LineMetrics>;
};

export type TextHit = {
	frameId: string;
	line: LineKind;
	x: number;
	top: number;
	width: number;
	height: number;
	fontPx: number;
};

export type RenderResult = {
	canvas: HTMLCanvasElement;
	hits: Array<TextHit>;
};

export type RenderOptions = {
	placeholders?: boolean;
	editorChrome?: boolean;
	hideLine?: { frameId: string; line: LineKind } | null;
	aspect?: number | null;
	fontId?: DemotivatorFontId;
};

export const ASPECT_PRESETS: Array<{
	id: string;
	label: string;
	value: number | null;
}> = [
	{ id: "auto", label: "Auto", value: null },
	{ id: "3-4", label: "3:4", value: 3 / 4 },
	{ id: "4-5", label: "4:5", value: 4 / 5 },
	{ id: "1-1", label: "1:1", value: 1 },
	{ id: "16-9", label: "16:9", value: 16 / 9 },
];

export const MIN_TEXT_SCALE = 0.02;
export const MAX_TEXT_SCALE = 0.2;
export const CAPTION_SCALE = 0.09;
export const SUBCAPTION_SCALE = 0.035;
export const MAX_SOURCE_SIZE = 1000;

export const DEFAULT_DEMOTIVATOR_FONT_ID: DemotivatorFontId = "classic";

export const DEMOTIVATOR_FONTS: Array<DemotivatorFont> = [
	{
		id: "classic",
		label: "Classic Times",
		family: '"Tinos", "Times New Roman", Times, serif',
	},
	{
		id: "georgia",
		label: "Georgia",
		family: 'Georgia, "Times New Roman", serif',
	},
	{
		id: "baskerville",
		label: "Baskerville",
		family: 'Baskerville, "Baskerville Old Face", "Hoefler Text", serif',
	},
	{
		id: "palatino",
		label: "Palatino",
		family: '"Palatino Linotype", Palatino, "Book Antiqua", serif',
	},
	{
		id: "arial",
		label: "Arial",
		family: "Arial, Helvetica, sans-serif",
	},
	{
		id: "courier",
		label: "Courier",
		family: '"Courier New", Courier, monospace',
	},
];

export function getDemotivatorFont(
	fontId: DemotivatorFontId = DEFAULT_DEMOTIVATOR_FONT_ID,
): DemotivatorFont {
	return (
		DEMOTIVATOR_FONTS.find((font) => font.id === fontId) ?? DEMOTIVATOR_FONTS[0]
	);
}

export const DEMOTIVATOR_FONT = getDemotivatorFont().family;

export const PLACEHOLDER_TEXT: Record<LineKind, string> = {
	caption: "Caption",
	subcaption: "smaller line",
};

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

export function lineHeightFor(fontPx: number): number {
	return Math.round(fontPx * 1.25);
}

export function frameMetrics(
	innerW: number,
	innerH: number,
	measured: Array<MeasuredLine>,
	measure: MeasureText,
): FrameMetrics {
	const pad = Math.round(Math.min(Math.max(innerW * 0.085, 36), 150));
	const borderGap = Math.max(6, Math.round(innerW * 0.008));
	const borderWidth = Math.max(2, Math.round(innerW * 0.0025));
	const width = innerW + pad * 2;
	const maxTextWidth = innerW + pad;

	let cursor = innerH + pad + Math.round(pad * 0.45);
	const textLines: Array<LineMetrics> = [];
	for (const line of measured) {
		const fontPx = Math.round(innerW * line.scale);
		const lines = wrapLines(line.text, fontPx, maxTextWidth, measure);
		if (lines.length === 0) continue;
		const boxHeight = lineHeightFor(fontPx) * lines.length;
		textLines.push({
			kind: line.kind,
			ghost: line.ghost,
			fontPx,
			lines,
			top: cursor,
			boxX: Math.round((width - maxTextWidth) / 2),
			boxWidth: maxTextWidth,
			boxHeight,
		});
		cursor += boxHeight + Math.round(fontPx * 0.25);
	}
	const height = cursor + Math.round(pad * 0.55);
	return {
		width,
		height,
		pad,
		imageX: pad,
		imageY: pad,
		borderGap,
		borderWidth,
		textLines,
	};
}

export function measuredLines(
	frame: DemotivatorFrame,
	placeholders: boolean,
): Array<MeasuredLine> {
	const kinds: Array<LineKind> = ["caption", "subcaption"];
	const result: Array<MeasuredLine> = [];
	for (const kind of kinds) {
		const line = frame[kind];
		const empty = line.text.trim() === "";
		if (empty && !placeholders) continue;
		result.push({
			kind,
			text: empty ? PLACEHOLDER_TEXT[kind] : line.text,
			scale: line.scale,
			ghost: empty,
		});
	}
	return result;
}

function paintFrame(
	inner: HTMLCanvasElement | HTMLImageElement,
	innerW: number,
	innerH: number,
	frame: DemotivatorFrame,
	options: RenderOptions,
): { canvas: HTMLCanvasElement; hits: Array<TextHit> } {
	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Canvas is not available");
	const fontFamily = getDemotivatorFont(options.fontId).family;
	const measure: MeasureText = (text, fontPx) => {
		ctx.font = `${fontPx}px ${fontFamily}`;
		return ctx.measureText(text).width;
	};
	const metrics = frameMetrics(
		innerW,
		innerH,
		measuredLines(frame, options.placeholders ?? false),
		measure,
	);

	canvas.width = metrics.width;
	canvas.height = metrics.height;
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

	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	const hits: Array<TextHit> = [];
	for (const line of metrics.textLines) {
		hits.push({
			frameId: frame.id,
			line: line.kind,
			x: line.boxX,
			top: line.top,
			width: line.boxWidth,
			height: line.boxHeight,
			fontPx: line.fontPx,
		});
		if (options.editorChrome) {
			ctx.save();
			ctx.setLineDash([7, 6]);
			ctx.strokeStyle = "rgba(255,255,255,0.22)";
			ctx.lineWidth = 2;
			ctx.strokeRect(
				line.boxX + 0.5,
				line.top - 5.5,
				line.boxWidth - 1,
				line.boxHeight + 11,
			);
			ctx.restore();
		}
		const hidden =
			options.hideLine?.frameId === frame.id &&
			options.hideLine?.line === line.kind;
		if (hidden) continue;
		ctx.fillStyle = line.ghost ? "rgba(255,255,255,0.28)" : "#ffffff";
		ctx.font = `${line.fontPx}px ${fontFamily}`;
		const lineHeight = lineHeightFor(line.fontPx);
		line.lines.forEach((row, index) => {
			ctx.fillText(
				row,
				metrics.width / 2,
				line.top + lineHeight * (index + 0.5),
			);
		});
	}
	return { canvas, hits };
}

export function renderDemotivator(
	image: HTMLImageElement,
	frames: Array<DemotivatorFrame>,
	options: RenderOptions = {},
): RenderResult {
	const ratio = Math.min(
		1,
		MAX_SOURCE_SIZE / Math.max(image.naturalWidth, image.naturalHeight),
	);
	let width = Math.max(1, Math.round(image.naturalWidth * ratio));
	let height = Math.max(1, Math.round(image.naturalHeight * ratio));
	let canvas: HTMLCanvasElement | HTMLImageElement = image;
	const hits: Array<TextHit> = [];
	for (const frame of frames) {
		const painted = paintFrame(canvas, width, height, frame, options);
		const offset = (painted.canvas.width - width) / 2;
		for (const hit of hits) {
			hit.x += offset;
			hit.top += offset;
		}
		hits.push(...painted.hits);
		canvas = painted.canvas;
		width = canvas.width;
		height = canvas.height;
	}
	if (frames.length === 0) {
		const flat = document.createElement("canvas");
		flat.width = width;
		flat.height = height;
		flat.getContext("2d")?.drawImage(image, 0, 0, width, height);
		return { canvas: flat, hits: [] };
	}
	let result = canvas as HTMLCanvasElement;
	if (options.aspect) {
		const padded = padToAspect(result, options.aspect);
		for (const hit of hits) {
			hit.x += padded.dx;
			hit.top += padded.dy;
		}
		result = padded.canvas;
	}
	return { canvas: result, hits };
}

function padToAspect(
	source: HTMLCanvasElement,
	aspect: number,
): { canvas: HTMLCanvasElement; dx: number; dy: number } {
	let width = source.width;
	let height = source.height;
	if (width / height < aspect) {
		width = Math.round(height * aspect);
	} else {
		height = Math.round(width / aspect);
	}
	if (width === source.width && height === source.height) {
		return { canvas: source, dx: 0, dy: 0 };
	}
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Canvas is not available");
	ctx.fillStyle = "#000000";
	ctx.fillRect(0, 0, width, height);
	const dx = Math.round((width - source.width) / 2);
	const dy = Math.round((height - source.height) / 2);
	ctx.drawImage(source, dx, dy);
	return { canvas, dx, dy };
}
