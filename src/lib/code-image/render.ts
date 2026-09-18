import type { CodeToken } from "./highlight";
import {
	CHROME,
	codeFontShorthand,
	edgeColors,
	GUTTER_GAP,
	type Layout,
	LIGHT_RIM,
	LINE_NUMBER_ALPHA,
	OUTLINE_LIGHT_ALPHA,
	rgba,
	type Settings,
	shadowSpec,
	TITLE_ALPHA,
	TITLE_FONT,
	TRAFFIC_LIGHTS,
	WINDOWS_GLYPH_ALPHA,
} from "./model";

export const GLASS_SATURATION = 1.5;
const SHADOW_DETOUR = 20000;

export type RenderInput = {
	settings: Settings;
	layout: Layout;
	lines: Array<Array<CodeToken>>;
	theme: { bg: string; fg: string };
	background: CanvasImageSource | null;
	scale: number;
};

function createCanvas(width: number, height: number) {
	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, Math.round(width));
	canvas.height = Math.max(1, Math.round(height));
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Canvas is not available");
	return { canvas, ctx };
}

const sourceSize = (source: CanvasImageSource) => {
	if (source instanceof HTMLImageElement) {
		return { width: source.naturalWidth, height: source.naturalHeight };
	}
	const sized = source as { width: number; height: number };
	return { width: sized.width, height: sized.height };
};

function drawCover(
	ctx: CanvasRenderingContext2D,
	source: CanvasImageSource,
	width: number,
	height: number,
) {
	const size = sourceSize(source);
	const scale = Math.max(width / size.width, height / size.height);
	const drawWidth = size.width * scale;
	const drawHeight = size.height * scale;
	ctx.imageSmoothingQuality = "high";
	ctx.drawImage(
		source,
		(width - drawWidth) / 2,
		(height - drawHeight) / 2,
		drawWidth,
		drawHeight,
	);
}

function extendEdges(source: HTMLCanvasElement, margin: number) {
	const { width, height } = source;
	const { canvas, ctx } = createCanvas(width + margin * 2, height + margin * 2);
	ctx.drawImage(source, margin, margin);
	ctx.drawImage(source, 0, 0, 1, height, 0, margin, margin, height);
	ctx.drawImage(
		source,
		width - 1,
		0,
		1,
		height,
		margin + width,
		margin,
		margin,
		height,
	);
	ctx.drawImage(canvas, 0, margin, canvas.width, 1, 0, 0, canvas.width, margin);
	ctx.drawImage(
		canvas,
		0,
		margin + height - 1,
		canvas.width,
		1,
		0,
		margin + height,
		canvas.width,
		margin,
	);
	return canvas;
}

let filterSupport: boolean | null = null;

function supportsCanvasFilter() {
	if (filterSupport === null) {
		const { ctx } = createCanvas(1, 1);
		ctx.filter = "blur(1px)";
		filterSupport = ctx.filter === "blur(1px)";
	}
	return filterSupport;
}

function boxBlurPass(
	input: Uint8ClampedArray,
	output: Uint8ClampedArray,
	width: number,
	height: number,
	radius: number,
	horizontal: boolean,
) {
	const span = radius * 2 + 1;
	const length = horizontal ? width : height;
	const rows = horizontal ? height : width;
	const stride = horizontal ? 4 : width * 4;
	const rowStride = horizontal ? width * 4 : 4;
	for (let row = 0; row < rows; row++) {
		const start = row * rowStride;
		for (let channel = 0; channel < 4; channel++) {
			let sum = 0;
			for (let i = -radius; i <= radius; i++) {
				const clamped = Math.min(length - 1, Math.max(0, i));
				sum += input[start + clamped * stride + channel];
			}
			for (let i = 0; i < length; i++) {
				output[start + i * stride + channel] = sum / span;
				const leaving = Math.max(0, i - radius);
				const entering = Math.min(length - 1, i + radius + 1);
				sum +=
					input[start + entering * stride + channel] -
					input[start + leaving * stride + channel];
			}
		}
	}
}

function saturatePixels(data: Uint8ClampedArray, amount: number) {
	for (let i = 0; i < data.length; i += 4) {
		const luma = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
		data[i] = luma + (data[i] - luma) * amount;
		data[i + 1] = luma + (data[i + 1] - luma) * amount;
		data[i + 2] = luma + (data[i + 2] - luma) * amount;
	}
}

function softwareGlass(source: HTMLCanvasElement, radius: number) {
	const shrink = Math.max(1, Math.floor(radius / 6));
	const small = createCanvas(source.width / shrink, source.height / shrink);
	small.ctx.imageSmoothingQuality = "high";
	small.ctx.drawImage(source, 0, 0, small.canvas.width, small.canvas.height);
	const { width, height } = small.canvas;
	const image = small.ctx.getImageData(0, 0, width, height);
	const boxRadius = Math.max(1, Math.round(radius / shrink));
	const pixels = image.data;
	const scratch = new Uint8ClampedArray(pixels.length);
	for (let pass = 0; pass < 3; pass++) {
		boxBlurPass(pixels, scratch, width, height, boxRadius, true);
		boxBlurPass(scratch, pixels, width, height, boxRadius, false);
	}
	saturatePixels(pixels, GLASS_SATURATION);
	small.ctx.putImageData(image, 0, 0);
	const result = createCanvas(source.width, source.height);
	result.ctx.imageSmoothingQuality = "high";
	result.ctx.drawImage(small.canvas, 0, 0, source.width, source.height);
	return result.canvas;
}

function frostedCopy(source: HTMLCanvasElement, radius: number) {
	if (!supportsCanvasFilter()) return softwareGlass(source, radius);
	const { canvas, ctx } = createCanvas(source.width, source.height);
	ctx.filter = `blur(${radius}px) saturate(${GLASS_SATURATION})`;
	ctx.drawImage(source, 0, 0);
	return canvas;
}

function windowPath(
	ctx: CanvasRenderingContext2D,
	layout: Layout,
	radius: number,
	inset = 0,
) {
	const { x, y, width, height } = layout.window;
	ctx.beginPath();
	ctx.roundRect(
		x + inset,
		y + inset,
		width - inset * 2,
		height - inset * 2,
		Math.max(0, radius - inset),
	);
}

function drawShadow(ctx: CanvasRenderingContext2D, input: RenderInput) {
	const { layout, settings, scale } = input;
	const shadow = shadowSpec(settings.shadow);
	if (shadow.alpha === 0) return;
	ctx.save();
	ctx.beginPath();
	ctx.rect(0, 0, layout.frame.width, layout.frame.height);
	ctx.roundRect(
		layout.window.x,
		layout.window.y,
		layout.window.width,
		layout.window.height,
		settings.radius,
	);
	ctx.clip("evenodd");
	ctx.shadowColor = `rgba(0, 0, 0, ${shadow.alpha})`;
	ctx.shadowBlur = shadow.blur * scale;
	ctx.shadowOffsetX = SHADOW_DETOUR * scale;
	ctx.shadowOffsetY = shadow.offsetY * scale;
	ctx.fillStyle = "#000";
	ctx.translate(-SHADOW_DETOUR, 0);
	windowPath(ctx, layout, settings.radius, -shadow.spread);
	ctx.fill();
	ctx.restore();
}

function drawGlass(
	ctx: CanvasRenderingContext2D,
	input: RenderInput,
	backdrop: HTMLCanvasElement | null,
) {
	const { layout, settings, theme, scale } = input;
	ctx.save();
	windowPath(ctx, layout, settings.radius);
	ctx.clip();
	const blurRadius = settings.blur * scale;
	if (backdrop && blurRadius > 0) {
		const margin = Math.ceil(blurRadius * 2);
		const frosted = frostedCopy(extendEdges(backdrop, margin), blurRadius);
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.drawImage(frosted, -margin, -margin);
		ctx.restore();
	}
	ctx.fillStyle = rgba(theme.bg, settings.opacity / 100);
	ctx.fillRect(
		layout.window.x,
		layout.window.y,
		layout.window.width,
		layout.window.height,
	);
	ctx.restore();

	const edges = edgeColors(settings.mode);
	ctx.lineWidth = 1;
	ctx.strokeStyle = edges.outer;
	windowPath(ctx, layout, settings.radius, -0.5);
	ctx.stroke();
	ctx.strokeStyle = edges.inner;
	windowPath(ctx, layout, settings.radius, 0.5);
	ctx.stroke();
}

function baselineOffset(ctx: CanvasRenderingContext2D, boxHeight: number) {
	const metrics = ctx.measureText("Mg");
	const ascent = metrics.fontBoundingBoxAscent;
	const descent = metrics.fontBoundingBoxDescent;
	return (boxHeight - (ascent + descent)) / 2 + ascent;
}

function drawChrome(ctx: CanvasRenderingContext2D, input: RenderInput) {
	const { layout, settings, theme } = input;
	if (settings.windowStyle === "none") return;
	const { x, y, width } = layout.window;
	const centerY = y + layout.barHeight / 2;

	if (settings.windowStyle === "windows") {
		const half = CHROME.windowsGlyphSize / 2;
		ctx.strokeStyle = rgba(theme.fg, WINDOWS_GLYPH_ALPHA);
		ctx.lineWidth = 1;
		const glyphX = (index: number) =>
			x + width - CHROME.windowsGlyphStart - index * CHROME.windowsGlyphGap;
		ctx.beginPath();
		ctx.moveTo(glyphX(0) - half, centerY - half);
		ctx.lineTo(glyphX(0) + half, centerY + half);
		ctx.moveTo(glyphX(0) + half, centerY - half);
		ctx.lineTo(glyphX(0) - half, centerY + half);
		ctx.stroke();
		ctx.strokeRect(
			glyphX(1) - half + 0.5,
			centerY - half + 0.5,
			CHROME.windowsGlyphSize - 1,
			CHROME.windowsGlyphSize - 1,
		);
		ctx.beginPath();
		ctx.moveTo(glyphX(2) - half, centerY + 0.5);
		ctx.lineTo(glyphX(2) + half, centerY + 0.5);
		ctx.stroke();
	} else {
		TRAFFIC_LIGHTS.forEach((color, index) => {
			const centerX = x + CHROME.lightStart + index * CHROME.lightGap;
			if (settings.windowStyle === "macos") {
				ctx.beginPath();
				ctx.arc(centerX, centerY, CHROME.lightRadius, 0, Math.PI * 2);
				ctx.fillStyle = color;
				ctx.fill();
			}
			ctx.strokeStyle =
				settings.windowStyle === "macos"
					? LIGHT_RIM
					: rgba(theme.fg, OUTLINE_LIGHT_ALPHA);
			ctx.beginPath();
			ctx.arc(centerX, centerY, CHROME.lightRadius - 0.5, 0, Math.PI * 2);
			ctx.lineWidth = 1;
			ctx.stroke();
		});
	}

	if (!settings.title) return;
	ctx.font = TITLE_FONT;
	ctx.textBaseline = "alphabetic";
	ctx.fillStyle = rgba(theme.fg, TITLE_ALPHA);
	ctx.fillText(
		settings.title,
		x + layout.title.x,
		y + baselineOffset(ctx, layout.barHeight),
	);
}

function drawCode(ctx: CanvasRenderingContext2D, input: RenderInput) {
	const { layout, settings, theme, lines } = input;
	const originX = layout.window.x + layout.code.x;
	const originY = layout.window.y + layout.code.y;
	ctx.textBaseline = "alphabetic";
	ctx.font = codeFontShorthand(settings);
	const baseline = baselineOffset(ctx, layout.code.lineHeight);

	if (settings.lineNumbers) {
		ctx.fillStyle = rgba(theme.fg, LINE_NUMBER_ALPHA);
		ctx.textAlign = "right";
		const numberX = originX - GUTTER_GAP;
		for (let index = 0; index < layout.lineCount; index++) {
			ctx.fillText(
				String(index + 1),
				numberX,
				originY + index * layout.code.lineHeight + baseline,
			);
		}
		ctx.textAlign = "left";
	}

	lines.forEach((line, lineIndex) => {
		let cursor = originX;
		const y = originY + lineIndex * layout.code.lineHeight + baseline;
		for (const token of line) {
			ctx.font = codeFontShorthand(settings, token);
			ctx.fillStyle = token.color;
			ctx.fillText(token.content, cursor, y);
			cursor += ctx.measureText(token.content).width;
		}
	});
}

export function renderCodeImage(input: RenderInput): HTMLCanvasElement {
	const { layout, scale, background } = input;
	const { canvas, ctx } = createCanvas(
		layout.frame.width * scale,
		layout.frame.height * scale,
	);
	let backdrop: HTMLCanvasElement | null = null;
	if (background) {
		const layer = createCanvas(canvas.width, canvas.height);
		drawCover(layer.ctx, background, canvas.width, canvas.height);
		backdrop = layer.canvas;
		ctx.drawImage(backdrop, 0, 0);
	}
	ctx.scale(scale, scale);
	drawShadow(ctx, input);
	drawGlass(ctx, input, backdrop);
	drawChrome(ctx, input);
	drawCode(ctx, input);
	return canvas;
}
