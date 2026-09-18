import type { HighlighterCore, LanguageInput, ThemeInput } from "shiki/core";
import type { Mode } from "./model";

export type CodeToken = {
	content: string;
	color: string;
	bold: boolean;
	italic: boolean;
};

type Swatch = { bg: string; fg: string; dots: [string, string, string] };

export type ThemeFamily = {
	id: string;
	label: string;
	light: Swatch & { name: string };
	dark: Swatch & { name: string };
};

export const THEME_FAMILIES: Array<ThemeFamily> = [
	{
		id: "catppuccin",
		label: "Catppuccin",
		light: {
			name: "catppuccin-latte",
			bg: "#eff1f5",
			fg: "#4c4f69",
			dots: ["#8839ef", "#40a02b", "#1e66f5"],
		},
		dark: {
			name: "catppuccin-mocha",
			bg: "#1e1e2e",
			fg: "#cdd6f4",
			dots: ["#cba6f7", "#a6e3a1", "#89b4fa"],
		},
	},
	{
		id: "github",
		label: "GitHub",
		light: {
			name: "github-light",
			bg: "#ffffff",
			fg: "#24292e",
			dots: ["#d73a49", "#032f62", "#6f42c1"],
		},
		dark: {
			name: "github-dark",
			bg: "#24292e",
			fg: "#e1e4e8",
			dots: ["#f97583", "#9ecbff", "#b392f0"],
		},
	},
	{
		id: "vitesse",
		label: "Vitesse",
		light: {
			name: "vitesse-light",
			bg: "#ffffff",
			fg: "#393a34",
			dots: ["#ab5959", "#b56959", "#59873a"],
		},
		dark: {
			name: "vitesse-dark",
			bg: "#121212",
			fg: "#dbd7ca",
			dots: ["#cb7676", "#c98a7d", "#80a665"],
		},
	},
	{
		id: "rose-pine",
		label: "Rosé Pine",
		light: {
			name: "rose-pine-dawn",
			bg: "#faf4ed",
			fg: "#575279",
			dots: ["#286983", "#ea9d34", "#d7827e"],
		},
		dark: {
			name: "rose-pine",
			bg: "#191724",
			fg: "#e0def4",
			dots: ["#31748f", "#f6c177", "#ebbcba"],
		},
	},
	{
		id: "one",
		label: "One",
		light: {
			name: "one-light",
			bg: "#fafafa",
			fg: "#383a42",
			dots: ["#a626a4", "#50a14f", "#4078f2"],
		},
		dark: {
			name: "one-dark-pro",
			bg: "#282c34",
			fg: "#abb2bf",
			dots: ["#c678dd", "#98c379", "#61afef"],
		},
	},
	{
		id: "night-owl",
		label: "Night Owl",
		light: {
			name: "night-owl-light",
			bg: "#fbfbfb",
			fg: "#403f53",
			dots: ["#994cc3", "#c96765", "#4876d6"],
		},
		dark: {
			name: "night-owl",
			bg: "#011627",
			fg: "#d6deeb",
			dots: ["#c792ea", "#ecc48d", "#82aaff"],
		},
	},
	{
		id: "gruvbox",
		label: "Gruvbox",
		light: {
			name: "gruvbox-light-medium",
			bg: "#fbf1c7",
			fg: "#3c3836",
			dots: ["#af3a03", "#79740e", "#b57614"],
		},
		dark: {
			name: "gruvbox-dark-medium",
			bg: "#282828",
			fg: "#ebdbb2",
			dots: ["#fe8019", "#b8bb26", "#fabd2f"],
		},
	},
	{
		id: "everforest",
		label: "Everforest",
		light: {
			name: "everforest-light",
			bg: "#fdf6e3",
			fg: "#5c6a72",
			dots: ["#f57d26", "#dfa000", "#8da101"],
		},
		dark: {
			name: "everforest-dark",
			bg: "#2d353b",
			fg: "#d3c6aa",
			dots: ["#e69875", "#dbbc7f", "#a7c080"],
		},
	},
	{
		id: "kanagawa",
		label: "Kanagawa",
		light: {
			name: "kanagawa-lotus",
			bg: "#f2ecbc",
			fg: "#545464",
			dots: ["#624c83", "#6f894e", "#4d699b"],
		},
		dark: {
			name: "kanagawa-wave",
			bg: "#1f1f28",
			fg: "#dcd7ba",
			dots: ["#957fb8", "#98bb6c", "#7e9cd8"],
		},
	},
	{
		id: "ayu",
		label: "Ayu",
		light: {
			name: "ayu-light",
			bg: "#f8f9fa",
			fg: "#5c6166",
			dots: ["#fa8532", "#86b300", "#eba400"],
		},
		dark: {
			name: "ayu-dark",
			bg: "#0d1017",
			fg: "#bfbdb6",
			dots: ["#ff8f40", "#aad94c", "#ffb454"],
		},
	},
	{
		id: "solarized",
		label: "Solarized",
		light: {
			name: "solarized-light",
			bg: "#fdf6e3",
			fg: "#657b83",
			dots: ["#586e75", "#2aa198", "#268bd2"],
		},
		dark: {
			name: "solarized-dark",
			bg: "#002b36",
			fg: "#839496",
			dots: ["#93a1a1", "#2aa198", "#268bd2"],
		},
	},
	{
		id: "min",
		label: "Min",
		light: {
			name: "min-light",
			bg: "#ffffff",
			fg: "#24292e",
			dots: ["#d32f2f", "#22863a", "#6f42c1"],
		},
		dark: {
			name: "min-dark",
			bg: "#1f1f1f",
			fg: "#b392f0",
			dots: ["#f97583", "#ffab70", "#79b8ff"],
		},
	},
];

export const getThemeFamily = (id: string) =>
	THEME_FAMILIES.find((family) => family.id === id) ?? THEME_FAMILIES[0];

export const getThemeVariant = (id: string, mode: Mode) =>
	getThemeFamily(id)[mode];

const THEME_LOADERS: Record<string, () => Promise<{ default: ThemeInput }>> = {
	"catppuccin-latte": () => import("shiki/themes/catppuccin-latte.mjs"),
	"catppuccin-mocha": () => import("shiki/themes/catppuccin-mocha.mjs"),
	"github-light": () => import("shiki/themes/github-light.mjs"),
	"github-dark": () => import("shiki/themes/github-dark.mjs"),
	"vitesse-light": () => import("shiki/themes/vitesse-light.mjs"),
	"vitesse-dark": () => import("shiki/themes/vitesse-dark.mjs"),
	"rose-pine-dawn": () => import("shiki/themes/rose-pine-dawn.mjs"),
	"rose-pine": () => import("shiki/themes/rose-pine.mjs"),
	"one-light": () => import("shiki/themes/one-light.mjs"),
	"one-dark-pro": () => import("shiki/themes/one-dark-pro.mjs"),
	"night-owl-light": () => import("shiki/themes/night-owl-light.mjs"),
	"night-owl": () => import("shiki/themes/night-owl.mjs"),
	"gruvbox-light-medium": () => import("shiki/themes/gruvbox-light-medium.mjs"),
	"gruvbox-dark-medium": () => import("shiki/themes/gruvbox-dark-medium.mjs"),
	"everforest-light": () => import("shiki/themes/everforest-light.mjs"),
	"everforest-dark": () => import("shiki/themes/everforest-dark.mjs"),
	"kanagawa-lotus": () => import("shiki/themes/kanagawa-lotus.mjs"),
	"kanagawa-wave": () => import("shiki/themes/kanagawa-wave.mjs"),
	"ayu-light": () => import("shiki/themes/ayu-light.mjs"),
	"ayu-dark": () => import("shiki/themes/ayu-dark.mjs"),
	"solarized-light": () => import("shiki/themes/solarized-light.mjs"),
	"solarized-dark": () => import("shiki/themes/solarized-dark.mjs"),
	"min-light": () => import("shiki/themes/min-light.mjs"),
	"min-dark": () => import("shiki/themes/min-dark.mjs"),
};

export const PLAIN_TEXT = "text";

type Language = {
	id: string;
	label: string;
	load: (() => Promise<{ default: LanguageInput }>) | null;
};

export const LANGUAGES: Array<Language> = [
	{
		id: "typescript",
		label: "TypeScript",
		load: () => import("shiki/langs/typescript.mjs"),
	},
	{ id: "tsx", label: "TSX", load: () => import("shiki/langs/tsx.mjs") },
	{
		id: "javascript",
		label: "JavaScript",
		load: () => import("shiki/langs/javascript.mjs"),
	},
	{ id: "jsx", label: "JSX", load: () => import("shiki/langs/jsx.mjs") },
	{
		id: "python",
		label: "Python",
		load: () => import("shiki/langs/python.mjs"),
	},
	{ id: "rust", label: "Rust", load: () => import("shiki/langs/rust.mjs") },
	{ id: "go", label: "Go", load: () => import("shiki/langs/go.mjs") },
	{ id: "java", label: "Java", load: () => import("shiki/langs/java.mjs") },
	{
		id: "kotlin",
		label: "Kotlin",
		load: () => import("shiki/langs/kotlin.mjs"),
	},
	{ id: "swift", label: "Swift", load: () => import("shiki/langs/swift.mjs") },
	{ id: "c", label: "C", load: () => import("shiki/langs/c.mjs") },
	{ id: "cpp", label: "C++", load: () => import("shiki/langs/cpp.mjs") },
	{ id: "csharp", label: "C#", load: () => import("shiki/langs/csharp.mjs") },
	{ id: "php", label: "PHP", load: () => import("shiki/langs/php.mjs") },
	{ id: "ruby", label: "Ruby", load: () => import("shiki/langs/ruby.mjs") },
	{ id: "lua", label: "Lua", load: () => import("shiki/langs/lua.mjs") },
	{
		id: "solidity",
		label: "Solidity",
		load: () => import("shiki/langs/solidity.mjs"),
	},
	{
		id: "shellscript",
		label: "Shell",
		load: () => import("shiki/langs/shellscript.mjs"),
	},
	{ id: "sql", label: "SQL", load: () => import("shiki/langs/sql.mjs") },
	{
		id: "graphql",
		label: "GraphQL",
		load: () => import("shiki/langs/graphql.mjs"),
	},
	{ id: "html", label: "HTML", load: () => import("shiki/langs/html.mjs") },
	{ id: "css", label: "CSS", load: () => import("shiki/langs/css.mjs") },
	{ id: "json", label: "JSON", load: () => import("shiki/langs/json.mjs") },
	{ id: "yaml", label: "YAML", load: () => import("shiki/langs/yaml.mjs") },
	{ id: "toml", label: "TOML", load: () => import("shiki/langs/toml.mjs") },
	{
		id: "docker",
		label: "Dockerfile",
		load: () => import("shiki/langs/docker.mjs"),
	},
	{
		id: "markdown",
		label: "Markdown",
		load: () => import("shiki/langs/markdown.mjs"),
	},
	{ id: PLAIN_TEXT, label: "Plain text", load: null },
];

const FONT_STYLE_ITALIC = 1;
const FONT_STYLE_BOLD = 2;

export type HighlightEngine = { core: HighlighterCore | null };

const IDLE_ENGINE: HighlightEngine = { core: null };
let engine = IDLE_ENGINE;
const listeners = new Set<() => void>();

const publish = (core: HighlighterCore) => {
	engine = { core };
	for (const listener of listeners) listener();
};

export const subscribeEngine = (listener: () => void) => {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};
export const getEngine = () => engine;
export const getIdleEngine = () => IDLE_ENGINE;

let highlighterPromise: Promise<HighlighterCore> | null = null;
const pending = new Map<string, Promise<void>>();

async function getHighlighter() {
	highlighterPromise ??= (async () => {
		const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] =
			await Promise.all([
				import("shiki/core"),
				import("shiki/engine/javascript"),
			]);
		return createHighlighterCore({
			themes: [],
			langs: [],
			engine: createJavaScriptRegexEngine(),
		});
	})();
	return highlighterPromise;
}

const loadOnce = (key: string, load: () => Promise<void>) => {
	let task = pending.get(key);
	if (!task) {
		task = load().catch((error) => {
			pending.delete(key);
			throw error;
		});
		pending.set(key, task);
	}
	return task;
};

export async function ensureHighlighting(language: string, themeName: string) {
	const core = await getHighlighter();
	const languageLoader = LANGUAGES.find((entry) => entry.id === language)?.load;
	const themeLoader = THEME_LOADERS[themeName];
	await Promise.all([
		languageLoader
			? loadOnce(`lang:${language}`, async () =>
					core.loadLanguage((await languageLoader()).default),
				)
			: null,
		themeLoader
			? loadOnce(`theme:${themeName}`, async () =>
					core.loadTheme((await themeLoader()).default),
				)
			: null,
	]);
	publish(core);
}

export const plainTokens = (
	code: string,
	color: string,
): Array<Array<CodeToken>> =>
	code
		.split("\n")
		.map((line) => [{ content: line, color, bold: false, italic: false }]);

export function highlightSync(
	{ core }: HighlightEngine,
	code: string,
	language: string,
	themeName: string,
	fallbackColor: string,
): Array<Array<CodeToken>> | null {
	if (!core?.getLoadedThemes().includes(themeName)) return null;
	const loaded =
		language === PLAIN_TEXT || core.getLoadedLanguages().includes(language);
	if (!loaded) return null;
	const result = core.codeToTokens(code, {
		lang: language,
		theme: themeName,
	});
	return result.tokens.map((line) =>
		line.map((token) => ({
			content: token.content,
			color: token.color ?? result.fg ?? fallbackColor,
			bold: ((token.fontStyle ?? 0) & FONT_STYLE_BOLD) !== 0,
			italic: ((token.fontStyle ?? 0) & FONT_STYLE_ITALIC) !== 0,
		})),
	);
}
