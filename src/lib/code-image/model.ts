export type Mode = "light" | "dark";
export type WindowStyle = "macos" | "outline" | "windows" | "none";

export const WINDOW_STYLES: Array<{ id: WindowStyle; label: string }> = [
	{ id: "macos", label: "macOS" },
	{ id: "outline", label: "Outline" },
	{ id: "windows", label: "Windows" },
	{ id: "none", label: "None" },
];

export const RATIOS = [
	{ id: "auto", label: "Auto", value: null },
	{ id: "16:9", label: "16:9", value: 16 / 9 },
	{ id: "4:3", label: "4:3", value: 4 / 3 },
	{ id: "1:1", label: "1:1", value: 1 },
	{ id: "4:5", label: "4:5", value: 4 / 5 },
	{ id: "9:16", label: "9:16", value: 9 / 16 },
] as const;
export type RatioId = (typeof RATIOS)[number]["id"];

export const PADDINGS = [16, 32, 64, 96, 128] as const;
export const EXPORT_SCALES = [1, 2, 4] as const;
export type ExportScale = (typeof EXPORT_SCALES)[number];

export const CODE_FONTS = [
	{
		id: "jetbrains",
		label: "JetBrains Mono",
		family: '"JetBrains Mono Variable"',
	},
	{ id: "geist", label: "Geist Mono", family: '"Geist Mono Variable"' },
	{ id: "fira", label: "Fira Code", family: '"Fira Code Variable"' },
	{
		id: "spline",
		label: "Spline Sans Mono",
		family: '"Spline Sans Mono Variable"',
	},
] as const;
export type CodeFontId = (typeof CODE_FONTS)[number]["id"];

export const LIMITS = {
	opacity: { min: 0, max: 100, step: 1 },
	blur: { min: 0, max: 60, step: 1 },
	radius: { min: 0, max: 28, step: 1 },
	shadow: { min: 0, max: 100, step: 1 },
	fontSize: { min: 11, max: 22, step: 0.5 },
	windowWidth: { min: 360, max: 1600 },
} as const;

export const MAX_CODE_LENGTH = 20000;
export const MAX_TITLE_LENGTH = 48;
export const TITLE_PLACEHOLDER = "Untitled";
export const TITLE_FONT = '500 13px "Inter Variable", sans-serif';
export const TITLE_FONT_SIZE = 13;

export type Settings = {
	code: string;
	title: string;
	language: string;
	themeId: string;
	mode: Mode;
	windowStyle: WindowStyle;
	windowWidth: number | null;
	opacity: number;
	blur: number;
	radius: number;
	shadow: number;
	fontId: CodeFontId;
	fontSize: number;
	lineNumbers: boolean;
	ratioId: RatioId;
	padding: number;
	backgroundId: string;
	exportScale: ExportScale;
};

export const DEFAULT_CODE = `type Frame = { title: string; blur: number };

function glass({ title, blur }: Frame) {
  const tint = blur > 20 ? "frosted" : "clear";
  return \`\${title} is \${tint}\`;
}

// Paste your own code over this
glass({ title: "snippet.ts", blur: 28 });`;

export const DEFAULT_SETTINGS: Settings = {
	code: DEFAULT_CODE,
	title: "snippet.ts",
	language: "typescript",
	themeId: "catppuccin",
	mode: "light",
	windowStyle: "macos",
	windowWidth: null,
	opacity: 68,
	blur: 28,
	radius: 14,
	shadow: 55,
	fontId: "jetbrains",
	fontSize: 14,
	lineNumbers: false,
	ratioId: "auto",
	padding: 64,
	backgroundId: "meadow",
	exportScale: 2,
};

const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));

const pickNumber = (
	value: unknown,
	fallback: number,
	{ min, max }: { min: number; max: number },
) =>
	typeof value === "number" && Number.isFinite(value)
		? clamp(value, min, max)
		: fallback;

const pickOption = <T>(
	value: unknown,
	options: ReadonlyArray<T>,
	fallback: T,
): T => (options.includes(value as T) ? (value as T) : fallback);

const pickString = (value: unknown, fallback: string, maxLength: number) =>
	typeof value === "string" ? value.slice(0, maxLength) : fallback;

export function sanitizeSettings(
	raw: unknown,
	known: { languages: Array<string>; themes: Array<string> },
): Settings {
	const d = DEFAULT_SETTINGS;
	if (!raw || typeof raw !== "object") return d;
	const r = raw as Record<string, unknown>;
	return {
		code: normalizeCode(pickString(r.code, d.code, MAX_CODE_LENGTH)),
		title: pickString(r.title, d.title, MAX_TITLE_LENGTH),
		language: pickOption(r.language, known.languages, d.language),
		themeId: pickOption(r.themeId, known.themes, d.themeId),
		mode: pickOption(r.mode, ["light", "dark"] as const, d.mode),
		windowStyle: pickOption(
			r.windowStyle,
			WINDOW_STYLES.map((style) => style.id),
			d.windowStyle,
		),
		windowWidth:
			typeof r.windowWidth === "number"
				? Math.round(pickNumber(r.windowWidth, 0, LIMITS.windowWidth))
				: null,
		opacity: pickNumber(r.opacity, d.opacity, LIMITS.opacity),
		blur: pickNumber(r.blur, d.blur, LIMITS.blur),
		radius: pickNumber(r.radius, d.radius, LIMITS.radius),
		shadow: pickNumber(r.shadow, d.shadow, LIMITS.shadow),
		fontId: pickOption(
			r.fontId,
			CODE_FONTS.map((font) => font.id),
			d.fontId,
		),
		fontSize: pickNumber(r.fontSize, d.fontSize, LIMITS.fontSize),
		lineNumbers:
			typeof r.lineNumbers === "boolean" ? r.lineNumbers : d.lineNumbers,
		ratioId: pickOption(
			r.ratioId,
			RATIOS.map((ratio) => ratio.id),
			d.ratioId,
		),
		padding: pickOption(
			r.padding,
			PADDINGS as ReadonlyArray<number>,
			d.padding,
		),
		backgroundId: pickString(r.backgroundId, d.backgroundId, 40),
		exportScale: pickOption(r.exportScale, EXPORT_SCALES, d.exportScale),
	};
}

export const resolveWindowWidth = (requested: number, contentWidth: number) =>
	requested <= contentWidth
		? null
		: Math.min(LIMITS.windowWidth.max, Math.round(requested));

export const normalizeCode = (code: string) =>
	code.replace(/\r\n?/g, "\n").replace(/\t/g, "  ");

export const getCodeFont = (id: CodeFontId) =>
	CODE_FONTS.find((font) => font.id === id) ?? CODE_FONTS[0];

export const codeFontFamily = (id: CodeFontId) =>
	`${getCodeFont(id).family}, ui-monospace, "SF Mono", monospace`;

export const codeFontShorthand = (
	settings: Pick<Settings, "fontId" | "fontSize">,
	style: { bold?: boolean; italic?: boolean } = {},
) =>
	`${style.italic ? "italic " : ""}${style.bold ? 700 : 400} ${settings.fontSize}px ${codeFontFamily(settings.fontId)}`;

export type Rgb = { r: number; g: number; b: number };

export function parseHexColor(hex: string): Rgb {
	const raw = hex.replace("#", "");
	const full =
		raw.length <= 4
			? raw
					.split("")
					.map((char) => char + char)
					.join("")
			: raw;
	const channel = (index: number) =>
		Number.parseInt(full.slice(index, index + 2), 16) || 0;
	return { r: channel(0), g: channel(2), b: channel(4) };
}

export const rgba = (hex: string, alpha: number) => {
	const { r, g, b } = parseHexColor(hex);
	return `rgba(${r}, ${g}, ${b}, ${Math.round(alpha * 1000) / 1000})`;
};

export type ShadowSpec = {
	offsetY: number;
	blur: number;
	spread: number;
	alpha: number;
};

export const shadowSpec = (shadow: number): ShadowSpec => ({
	offsetY: Math.round(shadow * 0.5),
	blur: Math.round(shadow * 1.1),
	spread: -Math.round(shadow * 0.2),
	alpha: shadow === 0 ? 0 : Math.round((0.2 + shadow * 0.0035) * 1000) / 1000,
});

export const edgeColors = (mode: Mode) => ({
	outer: mode === "dark" ? "rgba(0, 0, 0, 0.4)" : "rgba(0, 0, 0, 0.1)",
	inner:
		mode === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.5)",
});

export const LIGHT_RIM = "rgba(0, 0, 0, 0.14)";
export const OUTLINE_LIGHT_ALPHA = 0.4;
export const WINDOWS_GLYPH_ALPHA = 0.7;
export const TITLE_ALPHA = 0.6;
export const LINE_NUMBER_ALPHA = 0.35;
export const TRAFFIC_LIGHTS = ["#ff5f57", "#febc2e", "#28c840"] as const;

export const CHROME = {
	barHeight: 46,
	lightRadius: 6,
	lightStart: 22,
	lightGap: 20,
	windowsGlyphStart: 24,
	windowsGlyphGap: 30,
	windowsGlyphSize: 10,
	windowsTitleX: 18,
	titleReserve: 86,
} as const;

const CODE_PAD_X = 24;
const CODE_PAD_BOTTOM = 24;
const CODE_PAD_TOP_BARE = 24;
const CODE_PAD_TOP_UNDER_BAR = 6;
export const GUTTER_GAP = 20;
const LINE_HEIGHT_RATIO = 1.65;

export type Measure = {
	code: (text: string) => number;
	title: (text: string) => number;
};

export type Layout = {
	frame: { width: number; height: number };
	window: { x: number; y: number; width: number; height: number };
	contentWidth: number;
	barHeight: number;
	title: { x: number; width: number };
	gutterWidth: number;
	code: { x: number; y: number; width: number; lineHeight: number };
	lineCount: number;
};

type LayoutInput = Pick<
	Settings,
	| "title"
	| "windowStyle"
	| "windowWidth"
	| "fontSize"
	| "lineNumbers"
	| "ratioId"
	| "padding"
>;

export function computeLayout(
	settings: LayoutInput,
	lines: Array<string>,
	measure: Measure,
): Layout {
	const lineCount = Math.max(1, lines.length);
	const lineHeight = Math.round(settings.fontSize * LINE_HEIGHT_RATIO);
	const codeWidth = Math.ceil(
		lines.reduce((widest, line) => Math.max(widest, measure.code(line)), 0),
	);
	const gutterWidth = settings.lineNumbers
		? Math.ceil(measure.code("0".repeat(String(lineCount).length))) + GUTTER_GAP
		: 0;
	const hasBar = settings.windowStyle !== "none";
	const barHeight = hasBar ? CHROME.barHeight : 0;
	const titleWidth = hasBar
		? Math.ceil(measure.title(settings.title || TITLE_PLACEHOLDER))
		: 0;

	const contentWidth = Math.max(
		LIMITS.windowWidth.min,
		codeWidth + gutterWidth + CODE_PAD_X * 2,
		titleWidth + CHROME.titleReserve * 2,
	);
	const windowWidth = Math.max(contentWidth, settings.windowWidth ?? 0);
	const windowHeight =
		barHeight +
		(hasBar ? CODE_PAD_TOP_UNDER_BAR : CODE_PAD_TOP_BARE) +
		lineCount * lineHeight +
		CODE_PAD_BOTTOM;

	const innerWidth = windowWidth + settings.padding * 2;
	const innerHeight = windowHeight + settings.padding * 2;
	const ratio = RATIOS.find((r) => r.id === settings.ratioId)?.value ?? null;
	const frameHeight = ratio
		? Math.ceil(Math.max(innerHeight, innerWidth / ratio))
		: innerHeight;
	const frameWidth = ratio ? Math.ceil(frameHeight * ratio) : innerWidth;

	return {
		frame: { width: frameWidth, height: frameHeight },
		window: {
			x: Math.round((frameWidth - windowWidth) / 2),
			y: Math.round((frameHeight - windowHeight) / 2),
			width: windowWidth,
			height: windowHeight,
		},
		contentWidth,
		barHeight,
		title: {
			x:
				settings.windowStyle === "windows"
					? CHROME.windowsTitleX
					: Math.round((windowWidth - titleWidth) / 2),
			width: titleWidth,
		},
		gutterWidth,
		code: {
			x: CODE_PAD_X + gutterWidth,
			y: barHeight + (hasBar ? CODE_PAD_TOP_UNDER_BAR : CODE_PAD_TOP_BARE),
			width: windowWidth - CODE_PAD_X - gutterWidth,
			lineHeight,
		},
		lineCount,
	};
}

const MAX_EXPORT_PIXELS = 48_000_000;
const MAX_EXPORT_SIDE = 16_000;

export function effectiveExportScale(
	frame: Layout["frame"],
	requested: number,
): number {
	const byArea = Math.sqrt(MAX_EXPORT_PIXELS / (frame.width * frame.height));
	const bySide = MAX_EXPORT_SIDE / Math.max(frame.width, frame.height);
	return Math.max(0.25, Math.min(requested, byArea, bySide));
}

export const exportFileName = (title: string) => {
	const slug = title
		.toLowerCase()
		.replace(/\.[a-z0-9]+$/, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return `${slug || "code-image"}.png`;
};
