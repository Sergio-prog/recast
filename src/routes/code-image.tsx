import {
	ArrowCounterClockwiseIcon,
	CheckIcon,
	CopyIcon,
	DownloadSimpleIcon,
} from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import {
	useCallback,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { toast } from "sonner";
import { Segmented, SwapIcon } from "@/components/code-image/controls";
import { Inspector } from "@/components/code-image/inspector";
import { Stage, type StageMotion } from "@/components/code-image/stage";
import { Button } from "@/components/ui/button";
import { useDebounced } from "@/hooks/use-debounced";
import {
	BACKGROUND_CUSTOM,
	BACKGROUND_NONE,
	type Background,
	getPresetBackground,
	loadCustomBackground,
} from "@/lib/code-image/backgrounds";
import {
	ensureHighlighting,
	getEngine,
	getIdleEngine,
	getThemeVariant,
	highlightSync,
	LANGUAGES,
	plainTokens,
	subscribeEngine,
	THEME_FAMILIES,
} from "@/lib/code-image/highlight";
import {
	codeFontShorthand,
	computeLayout,
	DEFAULT_SETTINGS,
	EXPORT_SCALES,
	effectiveExportScale,
	exportFileName,
	type Measure,
	normalizeCode,
	type Settings,
	sanitizeSettings,
	TITLE_FONT,
} from "@/lib/code-image/model";
import { renderCodeImage } from "@/lib/code-image/render";

export const Route = createFileRoute("/code-image")({
	head: () => ({ meta: [{ title: "Code image — Recast" }] }),
	component: CodeImagePage,
});

const STORAGE_KEY = "recast.code-image.v1";
const FEEDBACK_MS = 1600;

const KNOWN = {
	languages: LANGUAGES.map((language) => language.id),
	themes: THEME_FAMILIES.map((family) => family.id),
};

function readStoredSettings(): Settings {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		const settings = sanitizeSettings(stored && JSON.parse(stored), KNOWN);
		return settings.backgroundId === BACKGROUND_CUSTOM
			? { ...settings, backgroundId: DEFAULT_SETTINGS.backgroundId }
			: settings;
	} catch {
		return DEFAULT_SETTINGS;
	}
}

let measureContexts: {
	code: CanvasRenderingContext2D;
	title: CanvasRenderingContext2D;
} | null = null;

function createMeasure(settings: Settings): Measure {
	if (!measureContexts) {
		const context = () => {
			const ctx = document.createElement("canvas").getContext("2d");
			if (!ctx) throw new Error("Canvas is not available");
			return ctx;
		};
		measureContexts = { code: context(), title: context() };
	}
	const { code, title } = measureContexts;
	code.font = codeFontShorthand(settings);
	title.font = TITLE_FONT;
	return {
		code: (text) => code.measureText(text).width,
		title: (text) => title.measureText(text).width,
	};
}

const resolveBackground = (
	backgroundId: string,
	custom: Background | null,
): Background | null => {
	if (backgroundId === BACKGROUND_NONE) return null;
	if (backgroundId === BACKGROUND_CUSTOM && custom) return custom;
	return (
		getPresetBackground(backgroundId) ??
		getPresetBackground(DEFAULT_SETTINGS.backgroundId)
	);
};

function CodeImagePage() {
	const [settings, setSettings] = useState(DEFAULT_SETTINGS);
	const [hydrated, setHydrated] = useState(false);
	const [motion, setMotion] = useState<StageMotion>("instant");
	const [custom, setCustom] = useState<Background | null>(null);
	const [feedback, setFeedback] = useState<"copy" | "save" | null>(null);
	const [, refreshFonts] = useReducer((revision: number) => revision + 1, 0);
	const engine = useSyncExternalStore(
		subscribeEngine,
		getEngine,
		getIdleEngine,
	);
	const feedbackTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

	useEffect(() => {
		setSettings(readStoredSettings());
		setHydrated(true);
		document.fonts.addEventListener("loadingdone", refreshFonts);
		return () =>
			document.fonts.removeEventListener("loadingdone", refreshFonts);
	}, []);

	const stored = useDebounced(settings, 400);
	useEffect(() => {
		if (!hydrated) return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
		} catch {}
	}, [stored, hydrated]);

	const customUrl = custom?.url;
	useEffect(
		() => () => {
			if (customUrl) URL.revokeObjectURL(customUrl);
		},
		[customUrl],
	);

	const variant = getThemeVariant(settings.themeId, settings.mode);
	useEffect(() => {
		ensureHighlighting(settings.language, variant.name).catch((error) => {
			console.error("code-image: highlighter failed to load", error);
			toast.error("Syntax colors could not load. Check your connection.", {
				id: "code-image-highlight",
			});
		});
	}, [settings.language, variant.name]);

	const lines = useMemo(
		() =>
			highlightSync(
				engine,
				settings.code,
				settings.language,
				variant.name,
				variant.fg,
			) ?? plainTokens(settings.code, variant.fg),
		[engine, settings.code, settings.language, variant.name, variant.fg],
	);

	const smooth = useCallback((patch: Partial<Settings>) => {
		setMotion("smooth");
		setSettings((prev) => ({ ...prev, ...patch }));
	}, []);
	const instant = useCallback((patch: Partial<Settings>) => {
		setMotion("instant");
		setSettings((prev) => ({ ...prev, ...patch }));
	}, []);

	const applyImage = useCallback(
		(file: File) => {
			if (!file.type.startsWith("image/")) {
				toast.error("Use an image file, such as JPG, PNG or WebP");
				return;
			}
			loadCustomBackground(file)
				.then((background) => {
					setCustom(background);
					smooth({ backgroundId: BACKGROUND_CUSTOM });
				})
				.catch(() => toast.error("This image could not be opened"));
		},
		[smooth],
	);

	const latest = useRef({ settings, custom });
	latest.current = { settings, custom };

	const renderBlob = useCallback(async () => {
		const { settings: current, custom: currentCustom } = latest.current;
		const theme = getThemeVariant(current.themeId, current.mode);
		await Promise.all([
			document.fonts.load(codeFontShorthand(current), current.code),
			document.fonts.load(TITLE_FONT, current.title || "a"),
			ensureHighlighting(current.language, theme.name).catch(() => null),
		]);
		const layout = computeLayout(
			current,
			current.code.split("\n"),
			createMeasure(current),
		);
		const canvas = renderCodeImage({
			settings: current,
			layout,
			lines:
				highlightSync(
					getEngine(),
					current.code,
					current.language,
					theme.name,
					theme.fg,
				) ?? plainTokens(current.code, theme.fg),
			theme,
			background:
				resolveBackground(current.backgroundId, currentCustom)?.source ?? null,
			scale: effectiveExportScale(layout.frame, current.exportScale),
		});
		const blob = await new Promise<Blob | null>((resolve) =>
			canvas.toBlob(resolve, "image/png"),
		);
		if (!blob) throw new Error("Canvas export returned no data");
		return blob;
	}, []);

	const confirm = useCallback((kind: "copy" | "save") => {
		setFeedback(kind);
		clearTimeout(feedbackTimer.current);
		feedbackTimer.current = setTimeout(() => setFeedback(null), FEEDBACK_MS);
	}, []);

	const save = useCallback(async () => {
		try {
			const blob = await renderBlob();
			const link = document.createElement("a");
			link.href = URL.createObjectURL(blob);
			link.download = exportFileName(latest.current.settings.title);
			link.click();
			URL.revokeObjectURL(link.href);
			confirm("save");
		} catch (error) {
			console.error("code-image: export failed", error);
			toast.error("The image could not be created. Try a smaller export size.");
		}
	}, [renderBlob, confirm]);

	const copy = useCallback(async () => {
		try {
			await navigator.clipboard.write([
				new ClipboardItem({ "image/png": renderBlob() }),
			]);
			confirm("copy");
		} catch (error) {
			console.error("code-image: copy failed", error);
			toast.error("This browser cannot copy images. Save the PNG instead.");
		}
	}, [renderBlob, confirm]);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (!(e.metaKey || e.ctrlKey)) return;
			const key = e.key.toLowerCase();
			if (key === "s" && !e.shiftKey) {
				e.preventDefault();
				void save();
			}
			if (key === "c" && e.shiftKey) {
				e.preventDefault();
				void copy();
			}
		};
		const onPaste = (e: ClipboardEvent) => {
			const file = Array.from(e.clipboardData?.files ?? []).find((f) =>
				f.type.startsWith("image/"),
			);
			if (!file) return;
			e.preventDefault();
			applyImage(file);
		};
		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("paste", onPaste);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("paste", onPaste);
		};
	}, [save, copy, applyImage]);

	const layout = hydrated
		? computeLayout(
				settings,
				settings.code.split("\n"),
				createMeasure(settings),
			)
		: null;
	const exportScale = layout
		? effectiveExportScale(layout.frame, settings.exportScale)
		: settings.exportScale;

	return (
		<main
			data-fixed-viewport
			className="mx-auto flex w-full max-w-6xl flex-col px-4 pb-10 pt-5 lg:h-[calc(100svh-57px)] lg:pb-5"
		>
			<div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
				<div>
					<h1 className="font-display text-xl font-semibold tracking-tight">
						Code image
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Type or paste code, pick a background, save a PNG. Nothing is
						uploaded.
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{layout && (
						<span className="mr-1 font-mono text-xs tabular-nums text-muted-foreground">
							{Math.round(layout.frame.width * exportScale)} ×{" "}
							{Math.round(layout.frame.height * exportScale)} px
						</span>
					)}
					<Segmented
						label="Export size"
						className="w-28"
						value={settings.exportScale}
						onChange={(scale) => instant({ exportScale: scale })}
						options={EXPORT_SCALES.map((scale) => ({
							value: scale,
							label: `${scale}x`,
							ariaLabel: `${scale}x export size`,
						}))}
					/>
					<Button
						variant="outline"
						size="sm"
						onClick={copy}
						disabled={!hydrated}
						title="Copy image (⌘⇧C)"
						className="transition-[scale,background-color] active:scale-[0.97]"
					>
						<SwapIcon
							swapped={feedback === "copy"}
							from={<CopyIcon />}
							to={<CheckIcon />}
						/>
						{feedback === "copy" ? "Copied" : "Copy"}
					</Button>
					<Button
						size="sm"
						onClick={save}
						disabled={!hydrated}
						title="Save PNG (⌘S)"
						className="transition-[scale,background-color] active:scale-[0.97]"
					>
						<SwapIcon
							swapped={feedback === "save"}
							from={<DownloadSimpleIcon />}
							to={<CheckIcon />}
						/>
						{feedback === "save" ? "Saved" : "Save PNG"}
					</Button>
				</div>
			</div>
			<div className="mt-4 grid min-h-0 flex-1 grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-stretch">
				<div className="flex min-h-0 flex-col">
					{layout ? (
						<Stage
							settings={settings}
							layout={layout}
							lines={lines}
							theme={variant}
							background={resolveBackground(settings.backgroundId, custom)}
							motion={motion}
							onCode={(code) => instant({ code: normalizeCode(code) })}
							onTitle={(title) => instant({ title })}
							onImage={applyImage}
							onWindowWidth={(windowWidth, next) =>
								(next === "smooth" ? smooth : instant)({ windowWidth })
							}
						/>
					) : (
						<div className="min-h-[26rem] flex-1 rounded-2xl border bg-muted/40 lg:min-h-0" />
					)}
					<p className="mt-2 text-xs text-muted-foreground">
						Click the code or the title to edit. Drag the window edges to set
						its width. Drop or paste an image to use it as the background.
					</p>
				</div>
				{hydrated && (
					<aside className="animate-layer-in lg:-mx-1.5 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:px-1.5 lg:pt-1 lg:pb-8 lg:[scrollbar-width:thin] lg:mask-b-from-[calc(100%-2rem)]">
						<Inspector
							settings={settings}
							customBackground={custom}
							onSmooth={smooth}
							onInstant={instant}
							onImage={applyImage}
						/>
						<Button
							variant="ghost"
							size="sm"
							className="mt-3 w-full text-muted-foreground"
							onClick={() =>
								smooth({
									...DEFAULT_SETTINGS,
									code: settings.code,
									title: settings.title,
									language: settings.language,
								})
							}
						>
							<ArrowCounterClockwiseIcon />
							Reset the look
						</Button>
					</aside>
				)}
			</div>
		</main>
	);
}
