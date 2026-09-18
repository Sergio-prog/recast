import {
	type CSSProperties,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { CHECKERBOARD } from "@/components/background-picker";
import type { Background } from "@/lib/code-image/backgrounds";
import type { CodeToken } from "@/lib/code-image/highlight";
import {
	CHROME,
	codeFontFamily,
	edgeColors,
	GUTTER_GAP,
	type Layout,
	LIGHT_RIM,
	LIMITS,
	LINE_NUMBER_ALPHA,
	MAX_CODE_LENGTH,
	MAX_TITLE_LENGTH,
	OUTLINE_LIGHT_ALPHA,
	resolveWindowWidth,
	rgba,
	type Settings,
	shadowSpec,
	TITLE_ALPHA,
	TITLE_FONT_SIZE,
	TITLE_PLACEHOLDER,
	TRAFFIC_LIGHTS,
	WINDOWS_GLYPH_ALPHA,
} from "@/lib/code-image/model";
import { GLASS_SATURATION } from "@/lib/code-image/render";
import { cn } from "@/lib/utils";

export type StageMotion = "smooth" | "instant";

const STAGE_PADDING = 24;
const MIN_STAGE_HEIGHT = 320;
const RESERVED_VIEWPORT_HEIGHT = 250;
const FIXED_VIEWPORT_QUERY = "(min-width: 64rem)";
const TAB = "  ";

const SMOOTH =
	"transition-[width,height,transform,translate,opacity,border-radius,background-color,box-shadow,backdrop-filter] duration-[380ms] ease-out-expo motion-reduce:transition-[opacity,background-color]";

type StageProps = {
	settings: Settings;
	layout: Layout;
	lines: Array<Array<CodeToken>>;
	theme: { bg: string; fg: string };
	background: Background | null;
	motion: StageMotion;
	onCode: (code: string) => void;
	onTitle: (title: string) => void;
	onImage: (file: File) => void;
	onWindowWidth: (width: number | null, motion: StageMotion) => void;
};

export function Stage({
	settings,
	layout,
	lines,
	theme,
	background,
	motion,
	onCode,
	onTitle,
	onImage,
	onWindowWidth,
}: StageProps) {
	const viewportRef = useRef<HTMLDivElement>(null);
	const [room, setRoom] = useState<{ width: number; height: number } | null>(
		null,
	);
	const [dropping, setDropping] = useState(false);

	useEffect(() => {
		const viewport = viewportRef.current;
		if (!viewport) return;
		const fixedViewport = window.matchMedia(FIXED_VIEWPORT_QUERY);
		const measure = () =>
			setRoom({
				width: viewport.clientWidth - STAGE_PADDING * 2,
				height: Math.max(
					MIN_STAGE_HEIGHT,
					fixedViewport.matches
						? viewport.clientHeight - STAGE_PADDING * 2
						: window.innerHeight - RESERVED_VIEWPORT_HEIGHT,
				),
			});
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(viewport);
		window.addEventListener("resize", measure);
		return () => {
			observer.disconnect();
			window.removeEventListener("resize", measure);
		};
	}, []);

	const onImageRef = useRef(onImage);
	onImageRef.current = onImage;
	useEffect(() => {
		const viewport = viewportRef.current;
		if (!viewport) return;
		const onDragOver = (e: DragEvent) => {
			if (!e.dataTransfer?.types.includes("Files")) return;
			e.preventDefault();
			setDropping(true);
		};
		const onDragLeave = () => setDropping(false);
		const onDrop = (e: DragEvent) => {
			e.preventDefault();
			setDropping(false);
			const file = Array.from(e.dataTransfer?.files ?? [])[0];
			if (file) onImageRef.current(file);
		};
		viewport.addEventListener("dragover", onDragOver);
		viewport.addEventListener("dragleave", onDragLeave);
		viewport.addEventListener("drop", onDrop);
		return () => {
			viewport.removeEventListener("dragover", onDragOver);
			viewport.removeEventListener("dragleave", onDragLeave);
			viewport.removeEventListener("drop", onDrop);
		};
	}, []);

	const scale = room
		? Math.min(
				1,
				room.width / layout.frame.width,
				room.height / layout.frame.height,
			)
		: 1;
	const transition = motion === "smooth" ? SMOOTH : "transition-none";

	return (
		<div
			ref={viewportRef}
			className={cn(
				"relative flex min-h-[26rem] flex-1 items-center lg:min-h-0 justify-center overflow-hidden rounded-2xl border bg-muted/40 bg-[radial-gradient(circle,var(--color-border)_1px,transparent_1px)] bg-[size:18px_18px] transition-shadow duration-300",
				dropping && "ring-[3px] ring-ring/60",
			)}
			style={{ padding: STAGE_PADDING }}
		>
			{room && (
				<div
					className={cn("animate-snapshot-in", transition)}
					style={{
						width: layout.frame.width * scale,
						height: layout.frame.height * scale,
					}}
				>
					<div
						className={cn(
							"relative origin-top-left overflow-hidden",
							transition,
						)}
						style={{
							width: layout.frame.width,
							height: layout.frame.height,
							transform: `scale(${scale})`,
						}}
					>
						<BackdropLayers background={background} />
						<CodeWindow
							settings={settings}
							layout={layout}
							lines={lines}
							theme={theme}
							transition={transition}
							onCode={onCode}
							onTitle={onTitle}
						/>
						<ResizeHandles
							layout={layout}
							scale={scale}
							custom={settings.windowWidth !== null}
							transition={transition}
							onWindowWidth={onWindowWidth}
						/>
					</div>
				</div>
			)}
		</div>
	);
}

const positionKeyed = (lines: Array<Array<CodeToken>>) =>
	lines.map((tokens, row) => ({
		key: `row-${row}`,
		tokens: tokens.map((token, column) => ({ key: `token-${column}`, token })),
	}));

type Layer = { key: string; url: string | null };

function BackdropLayers({ background }: { background: Background | null }) {
	const current: Layer = {
		key: background?.url ?? "none",
		url: background?.url ?? null,
	};
	const [layers, setLayers] = useState<Array<Layer>>([current]);
	if (layers[layers.length - 1].key !== current.key) {
		setLayers([
			...layers.filter((layer) => layer.key !== current.key).slice(-2),
			current,
		]);
	}
	return layers.map((layer, index) => (
		<div
			key={layer.key}
			onAnimationEnd={() => {
				if (index === layers.length - 1) setLayers([layer]);
			}}
			className={cn(
				"absolute inset-0 bg-cover bg-center",
				index > 0 && "animate-layer-in",
				!layer.url && ["bg-background", CHECKERBOARD],
			)}
			style={layer.url ? { backgroundImage: `url("${layer.url}")` } : undefined}
		/>
	));
}

function CodeWindow({
	settings,
	layout,
	lines,
	theme,
	transition,
	onCode,
	onTitle,
}: Pick<
	StageProps,
	"settings" | "layout" | "lines" | "theme" | "onCode" | "onTitle"
> & { transition: string }) {
	const shadow = shadowSpec(settings.shadow);
	const edges = edgeColors(settings.mode);
	const glass = `blur(${settings.blur}px) saturate(${GLASS_SATURATION})`;
	const codeFont: CSSProperties = {
		fontFamily: codeFontFamily(settings.fontId),
		fontSize: settings.fontSize,
		lineHeight: `${layout.code.lineHeight}px`,
		fontVariantLigatures: "normal",
	};
	const codeHeight = layout.lineCount * layout.code.lineHeight;
	const rows = useMemo(() => positionKeyed(lines), [lines]);

	return (
		<div
			className={cn("absolute top-0 left-0 overflow-hidden", transition)}
			style={{
				width: layout.window.width,
				height: layout.window.height,
				transform: `translate(${layout.window.x}px, ${layout.window.y}px)`,
				borderRadius: settings.radius,
				backgroundColor: rgba(theme.bg, settings.opacity / 100),
				backdropFilter: glass,
				WebkitBackdropFilter: glass,
				boxShadow: `0 ${shadow.offsetY}px ${shadow.blur}px ${shadow.spread}px rgba(0, 0, 0, ${shadow.alpha}), 0 0 0 1px ${edges.outer}, inset 0 0 0 1px ${edges.inner}`,
			}}
		>
			<TitleBar
				settings={settings}
				layout={layout}
				theme={theme}
				transition={transition}
				onTitle={onTitle}
			/>
			<div
				aria-hidden
				className={cn(
					"pointer-events-none absolute top-0 left-0 text-right whitespace-pre",
					transition,
					!settings.lineNumbers && "opacity-0",
				)}
				style={{
					...codeFont,
					width: Math.max(0, layout.code.x - GUTTER_GAP),
					transform: `translateY(${layout.code.y}px)`,
					color: rgba(theme.fg, LINE_NUMBER_ALPHA),
				}}
			>
				{Array.from({ length: layout.lineCount }, (_, index) => index + 1).join(
					"\n",
				)}
			</div>
			<div
				className={cn("absolute top-0 left-0", transition)}
				style={{
					transform: `translate(${layout.code.x}px, ${layout.code.y}px)`,
					width: layout.code.width,
					height: codeHeight,
				}}
			>
				<pre
					aria-hidden
					className="pointer-events-none absolute inset-0 m-0 whitespace-pre"
					style={codeFont}
				>
					{rows.map((row) => (
						<div key={row.key} style={{ height: layout.code.lineHeight }}>
							{row.tokens.map(({ key, token }) => (
								<span
									key={key}
									className="transition-colors duration-300"
									style={{
										color: token.color,
										fontWeight: token.bold ? 700 : 400,
										fontStyle: token.italic ? "italic" : "normal",
									}}
								>
									{token.content}
								</span>
							))}
						</div>
					))}
				</pre>
				<textarea
					value={settings.code}
					onChange={(e) => onCode(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Escape") e.currentTarget.blur();
						if (e.key !== "Tab" || e.shiftKey) return;
						e.preventDefault();
						if (!document.execCommand("insertText", false, TAB)) {
							const el = e.currentTarget;
							el.setRangeText(TAB, el.selectionStart, el.selectionEnd, "end");
							onCode(el.value);
						}
					}}
					aria-label="Code"
					wrap="off"
					spellCheck={false}
					autoCapitalize="off"
					autoCorrect="off"
					autoComplete="off"
					maxLength={MAX_CODE_LENGTH}
					className="absolute inset-0 m-0 block size-full resize-none overflow-hidden border-0 bg-transparent p-0 whitespace-pre text-transparent outline-none selection:bg-(--selection) selection:text-transparent"
					style={
						{
							...codeFont,
							caretColor: theme.fg,
							"--selection": rgba(theme.fg, 0.18),
						} as CSSProperties
					}
				/>
			</div>
		</div>
	);
}

const HANDLE_HIT_WIDTH = 16;
const KEYBOARD_RESIZE_STEP = 16;
const SIDES = ["left", "right"] as const;

function ResizeHandles({
	layout,
	scale,
	custom,
	transition,
	onWindowWidth,
}: Pick<StageProps, "layout" | "onWindowWidth"> & {
	scale: number;
	custom: boolean;
	transition: string;
}) {
	const drag = useRef<{ startX: number; startWidth: number } | null>(null);
	const [dragging, setDragging] = useState(false);
	const { x, y, width, height } = layout.window;

	const resizeTo = (requested: number) =>
		onWindowWidth(
			resolveWindowWidth(requested, layout.contentWidth),
			"instant",
		);
	const release = () => {
		drag.current = null;
		setDragging(false);
	};

	return (
		<>
			{SIDES.map((side) => {
				const direction = side === "right" ? 1 : -1;
				const edgeX = side === "right" ? x + width : x;
				return (
					<button
						key={side}
						type="button"
						aria-label={`Drag to resize the window from the ${side} edge`}
						onPointerDown={(e) => {
							if (e.button !== 0) return;
							e.preventDefault();
							e.currentTarget.setPointerCapture(e.pointerId);
							drag.current = { startX: e.clientX, startWidth: width };
							setDragging(true);
						}}
						onPointerMove={(e) => {
							if (!drag.current) return;
							const travelled = (e.clientX - drag.current.startX) / scale;
							resizeTo(drag.current.startWidth + travelled * direction * 2);
						}}
						onPointerUp={release}
						onPointerCancel={release}
						onDoubleClick={() => onWindowWidth(null, "smooth")}
						onKeyDown={(e) => {
							if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
								e.preventDefault();
								const step = e.key === "ArrowRight" ? direction : -direction;
								resizeTo(
									Math.min(
										LIMITS.windowWidth.max,
										width + step * KEYBOARD_RESIZE_STEP,
									),
								);
							}
							if (e.key === "Enter") onWindowWidth(null, "smooth");
						}}
						className={cn(
							"group/handle absolute top-0 left-0 flex cursor-ew-resize touch-none items-center justify-center outline-none",
							transition,
						)}
						style={{
							width: HANDLE_HIT_WIDTH,
							height,
							transform: `translate(${edgeX - HANDLE_HIT_WIDTH / 2}px, ${y}px)`,
						}}
					>
						<span
							className={cn(
								"h-8 w-1 rounded-full bg-white opacity-0 shadow-[0_0_0_1px_rgba(0,0,0,0.18),0_2px_8px_rgba(0,0,0,0.35)] transition-[opacity,height,scale] duration-300 ease-out-expo group-hover/frame:opacity-70 group-hover/handle:h-10 group-hover/handle:opacity-100 group-focus-visible/handle:opacity-100 group-active/handle:scale-x-150",
								dragging && "opacity-100",
							)}
						/>
					</button>
				);
			})}
			<span
				aria-hidden
				className={cn(
					"pointer-events-none absolute top-0 left-0 flex justify-center transition-opacity duration-200",
					!dragging && "opacity-0",
				)}
				style={{
					width,
					transform: `translate(${x}px, ${y + height - 21}px)`,
				}}
			>
				<span className="rounded-full bg-black/65 px-2 font-mono text-[10px] leading-[18px] text-white tabular-nums backdrop-blur-sm">
					{custom ? `${width}px` : "Auto"}
				</span>
			</span>
		</>
	);
}

function TitleBar({
	settings,
	layout,
	theme,
	transition,
	onTitle,
}: Pick<StageProps, "settings" | "layout" | "theme" | "onTitle"> & {
	transition: string;
}) {
	const style = settings.windowStyle;
	const hasLights = style === "macos" || style === "outline";
	const glyphColor = rgba(theme.fg, WINDOWS_GLYPH_ALPHA);
	const half = CHROME.windowsGlyphSize / 2;

	return (
		<div
			className={cn(
				"absolute inset-x-0 top-0",
				transition,
				style === "none" && "pointer-events-none opacity-0",
			)}
			style={{ height: CHROME.barHeight }}
		>
			<div
				aria-hidden
				className={cn(
					"absolute inset-0 transition-[opacity,scale] duration-300 ease-out-expo",
					!hasLights && "scale-90 opacity-0",
				)}
				style={{
					transformOrigin: `${CHROME.lightStart + CHROME.lightGap}px 50%`,
				}}
			>
				{TRAFFIC_LIGHTS.map((color, index) => (
					<span
						key={color}
						className="absolute top-1/2 rounded-full border transition-colors duration-300"
						style={{
							width: CHROME.lightRadius * 2,
							height: CHROME.lightRadius * 2,
							left:
								CHROME.lightStart +
								index * CHROME.lightGap -
								CHROME.lightRadius,
							marginTop: -CHROME.lightRadius,
							backgroundColor: style === "outline" ? "transparent" : color,
							borderColor:
								style === "outline"
									? rgba(theme.fg, OUTLINE_LIGHT_ALPHA)
									: LIGHT_RIM,
						}}
					/>
				))}
			</div>
			<svg
				aria-hidden
				className={cn(
					"absolute top-0 right-0 h-full overflow-visible transition-[opacity,translate] duration-300 ease-out-expo",
					style !== "windows" && "translate-x-2 opacity-0",
				)}
				width={CHROME.windowsGlyphStart + CHROME.windowsGlyphGap * 2 + half}
				stroke={glyphColor}
				strokeWidth={1}
				fill="none"
			>
				<title>Window controls</title>
				{[0, 1, 2].map((index) => {
					const cx =
						CHROME.windowsGlyphGap * 2 + half - index * CHROME.windowsGlyphGap;
					const cy = CHROME.barHeight / 2;
					if (index === 0) {
						return (
							<path
								key="close"
								d={`M${cx - half} ${cy - half}L${cx + half} ${cy + half}M${cx + half} ${cy - half}L${cx - half} ${cy + half}`}
							/>
						);
					}
					if (index === 1) {
						return (
							<rect
								key="maximize"
								x={cx - half + 0.5}
								y={cy - half + 0.5}
								width={CHROME.windowsGlyphSize - 1}
								height={CHROME.windowsGlyphSize - 1}
							/>
						);
					}
					return (
						<path
							key="minimize"
							d={`M${cx - half} ${cy + 0.5}L${cx + half} ${cy + 0.5}`}
						/>
					);
				})}
			</svg>
			<input
				value={settings.title}
				onChange={(e) => onTitle(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
				}}
				placeholder={TITLE_PLACEHOLDER}
				aria-label="Window title"
				spellCheck={false}
				maxLength={MAX_TITLE_LENGTH}
				tabIndex={style === "none" ? -1 : 0}
				className={cn(
					"absolute top-0 left-0 m-0 border-0 bg-transparent p-0 font-sans font-medium outline-none placeholder:text-(--placeholder)",
					transition,
				)}
				style={
					{
						height: CHROME.barHeight,
						lineHeight: `${CHROME.barHeight}px`,
						width: layout.title.width + 2,
						transform: `translateX(${layout.title.x}px)`,
						fontSize: TITLE_FONT_SIZE,
						color: rgba(theme.fg, TITLE_ALPHA),
						caretColor: theme.fg,
						"--placeholder": rgba(theme.fg, 0.3),
					} as CSSProperties
				}
			/>
		</div>
	);
}
