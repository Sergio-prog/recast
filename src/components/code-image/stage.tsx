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
const RUBBER_BAND_LIMIT = 20;
const RUBBER_BAND_STIFFNESS = 0.55;

const rubberBand = (overshoot: number) =>
	RUBBER_BAND_LIMIT *
	(1 - 1 / ((overshoot * RUBBER_BAND_STIFFNESS) / RUBBER_BAND_LIMIT + 1));

const overshootSqueeze = (requested: number, contentWidth: number) => {
	if (requested < contentWidth) return rubberBand(contentWidth - requested);
	if (requested > LIMITS.windowWidth.max)
		return -rubberBand(requested - LIMITS.windowWidth.max);
	return 0;
};

const squeezeLayout = (
	layout: Layout,
	squeeze: number,
	titleFollowsEdge: boolean,
): Layout => ({
	...layout,
	window: {
		...layout.window,
		x: layout.window.x + squeeze / 2,
		width: layout.window.width - squeeze,
	},
	title: {
		...layout.title,
		x: layout.title.x - (titleFollowsEdge ? 0 : squeeze / 2),
	},
	code: { ...layout.code, x: layout.code.x - squeeze / 2 },
});

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
	const [squeeze, setSqueeze] = useState(0);

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
							"group/frame relative origin-top-left overflow-hidden",
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
							layout={squeezeLayout(
								layout,
								squeeze,
								settings.windowStyle === "windows",
							)}
							lines={lines}
							theme={theme}
							transition={transition}
							onCode={onCode}
							onTitle={onTitle}
						/>
						<ResizeHandles
							layout={layout}
							scale={scale}
							squeeze={squeeze}
							requestedWidth={settings.windowWidth}
							transition={transition}
							onWindowWidth={onWindowWidth}
							onSqueeze={setSqueeze}
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

type Layer = { key: string; url: string | null; fadesIn: boolean };

const MAX_BACKDROP_LAYERS = 3;

function BackdropLayers({ background }: { background: Background | null }) {
	const currentKey = background?.url ?? "none";
	const [layers, setLayers] = useState<Array<Layer>>([
		{ key: currentKey, url: background?.url ?? null, fadesIn: false },
	]);
	if (!layers.some((layer) => layer.key === currentKey)) {
		setLayers([
			...layers.slice(1 - MAX_BACKDROP_LAYERS),
			{ key: currentKey, url: background?.url ?? null, fadesIn: true },
		]);
	}
	const activeIndex = layers.findIndex((layer) => layer.key === currentKey);

	const settle = (key: string) =>
		setLayers((stack) => {
			const settled = stack.findIndex((layer) => layer.key === key);
			const active = stack.findIndex((layer) => layer.key === currentKey);
			if (settled > active) return stack.filter((layer) => layer.key !== key);
			if (settled === active) return stack.slice(active);
			return stack;
		});

	return layers.map((layer, index) => (
		<div
			key={layer.key}
			onTransitionEnd={(e) => {
				if (e.propertyName === "opacity") settle(layer.key);
			}}
			className={cn(
				"absolute inset-0 bg-cover bg-center transition-opacity duration-[450ms] ease-out",
				layer.fadesIn && "starting:opacity-0",
				index > activeIndex && "opacity-0 duration-[250ms]",
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
	squeeze,
	requestedWidth,
	transition,
	onWindowWidth,
	onSqueeze,
}: Pick<StageProps, "layout" | "onWindowWidth"> & {
	scale: number;
	squeeze: number;
	requestedWidth: number | null;
	transition: string;
	onSqueeze: (squeeze: number) => void;
}) {
	const drag = useRef<{ startX: number; startWidth: number } | null>(null);
	const [dragging, setDragging] = useState(false);
	const { y, height } = layout.window;
	const x = layout.window.x + squeeze / 2;
	const width = layout.window.width - squeeze;

	const resizeTo = (requested: number) =>
		onWindowWidth(
			resolveWindowWidth(requested, layout.contentWidth),
			"instant",
		);
	const release = () => {
		if (!drag.current) return;
		drag.current = null;
		setDragging(false);
		onSqueeze(0);
		onWindowWidth(requestedWidth, "smooth");
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
							drag.current = {
								startX: e.clientX,
								startWidth: layout.window.width,
							};
							setDragging(true);
						}}
						onPointerMove={(e) => {
							if (!drag.current) return;
							const travelled = (e.clientX - drag.current.startX) / scale;
							const requested =
								drag.current.startWidth + travelled * direction * 2;
							onSqueeze(overshootSqueeze(requested, layout.contentWidth));
							resizeTo(requested);
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
										layout.window.width + step * KEYBOARD_RESIZE_STEP,
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
					{requestedWidth === null ? "Auto" : `${layout.window.width}px`}
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
