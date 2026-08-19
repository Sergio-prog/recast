import {
	ArrowClockwiseIcon,
	ArrowsOutLineHorizontalIcon,
	CaretDownIcon,
	CaretUpIcon,
	MagnifyingGlassMinusIcon,
	MagnifyingGlassPlusIcon,
} from "@phosphor-icons/react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { loadPdfjs, type Pdfjs } from "@/lib/pdf-client";
import { cn } from "@/lib/utils";

type PageSize = { width: number; height: number; rotate: number };
type Zoom = "fit" | number;

const ZOOM_STEPS = [0.5, 0.67, 0.8, 1, 1.25, 1.5, 2, 3];
const PAGE_GAP = 16;
const PAGE_PADDING = 24;
const THUMB_WIDTH = 112;

export function PdfViewer({ data }: { data: ArrayBuffer }) {
	const [pdfjs, setPdfjs] = useState<Pdfjs | null>(null);
	const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
	const [sizes, setSizes] = useState<Array<PageSize>>([]);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		let task: ReturnType<Pdfjs["getDocument"]> | null = null;
		setDoc(null);
		setSizes([]);
		setError(null);
		void (async () => {
			try {
				const lib = await loadPdfjs();
				if (cancelled) return;
				task = lib.getDocument({ data: new Uint8Array(data.slice(0)) });
				const document = await task.promise;
				if (cancelled) return;
				const pages = await Promise.all(
					Array.from({ length: document.numPages }, (_, i) =>
						document.getPage(i + 1),
					),
				);
				if (cancelled) return;
				setSizes(
					pages.map((page) => {
						const viewport = page.getViewport({ scale: 1 });
						return {
							width: viewport.width,
							height: viewport.height,
							rotate: page.rotate,
						};
					}),
				);
				setPdfjs(lib);
				setDoc(document);
			} catch (e) {
				if (cancelled) return;
				console.error(e);
				const name = e instanceof Error ? e.name : "";
				setError(
					name === "PasswordException"
						? "This PDF is password-protected. Remove the password and try again."
						: name === "InvalidPDFException"
							? "This file isn’t a readable PDF."
							: "The PDF couldn’t be opened.",
				);
			}
		})();
		return () => {
			cancelled = true;
			void task?.destroy();
		};
	}, [data]);

	if (error) {
		return (
			<div className="flex h-full items-center justify-center p-8 text-center">
				<p className="max-w-sm text-sm text-muted-foreground">{error}</p>
			</div>
		);
	}
	if (!doc || !pdfjs) {
		return (
			<div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
				<Spinner />
				Opening PDF
			</div>
		);
	}
	return <PdfDocument pdfjs={pdfjs} doc={doc} sizes={sizes} />;
}

function PdfDocument({
	pdfjs,
	doc,
	sizes,
}: {
	pdfjs: Pdfjs;
	doc: PDFDocumentProxy;
	sizes: Array<PageSize>;
}) {
	const [zoom, setZoom] = useState<Zoom>("fit");
	const [rotation, setRotation] = useState(0);
	const [current, setCurrent] = useState(1);
	const [pageInput, setPageInput] = useState("1");
	const scrollRef = useRef<HTMLDivElement>(null);
	const [containerWidth, setContainerWidth] = useState(800);

	useLayoutEffect(() => {
		const element = scrollRef.current;
		if (!element) return;
		const observer = new ResizeObserver(() =>
			setContainerWidth(element.clientWidth),
		);
		observer.observe(element);
		return () => observer.disconnect();
	}, []);

	const rotated = useMemo(
		() =>
			sizes.map((size) =>
				rotation % 180 === 0
					? { width: size.width, height: size.height }
					: { width: size.height, height: size.width },
			),
		[sizes, rotation],
	);
	const pageNumbers = useMemo(
		() => Array.from({ length: doc.numPages }, (_, i) => i + 1),
		[doc.numPages],
	);
	const widest = rotated.reduce((max, size) => Math.max(max, size.width), 1);
	const fitScale = Math.max(0.1, (containerWidth - PAGE_PADDING * 2) / widest);
	const scale = zoom === "fit" ? fitScale : zoom;

	const offsets = useMemo(() => {
		const result = [PAGE_PADDING];
		for (const size of rotated)
			result.push(
				result[result.length - 1] + Math.round(size.height * scale) + PAGE_GAP,
			);
		return result;
	}, [rotated, scale]);

	const layoutRef = useRef({ scale, rotation });
	useLayoutEffect(() => {
		const element = scrollRef.current;
		const previous = layoutRef.current;
		layoutRef.current = { scale, rotation };
		if (!element) return;
		if (previous.scale === scale && previous.rotation === rotation) return;
		const anchor =
			(element.scrollTop - PAGE_PADDING) / Math.max(1, previous.scale);
		element.scrollTop = anchor * scale + PAGE_PADDING;
	}, [scale, rotation]);

	const updateCurrent = useCallback(() => {
		const element = scrollRef.current;
		if (!element) return;
		const probe = element.scrollTop + element.clientHeight * 0.4;
		let page = 1;
		for (let i = 0; i < offsets.length - 1; i++) {
			if (offsets[i] <= probe) page = i + 1;
		}
		setCurrent(page);
	}, [offsets]);

	useEffect(() => {
		setPageInput(String(current));
	}, [current]);

	const goTo = (pageNumber: number) => {
		const element = scrollRef.current;
		const target = Math.min(doc.numPages, Math.max(1, pageNumber));
		if (!element) return;
		element.scrollTo({ top: offsets[target - 1] - PAGE_PADDING / 2 });
		setCurrent(target);
	};

	const zoomBy = (direction: 1 | -1) => {
		const next =
			direction === 1
				? ZOOM_STEPS.find((step) => step > scale + 0.01)
				: [...ZOOM_STEPS].reverse().find((step) => step < scale - 0.01);
		if (next !== undefined) setZoom(next);
	};

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label="Previous page"
						disabled={current <= 1}
						onClick={() => goTo(current - 1)}
					>
						<CaretUpIcon />
					</Button>
					<form
						className="flex items-center gap-1.5 font-mono text-xs tabular-nums"
						onSubmit={(e) => {
							e.preventDefault();
							const parsed = Number.parseInt(pageInput, 10);
							if (Number.isNaN(parsed)) setPageInput(String(current));
							else goTo(parsed);
						}}
					>
						<input
							value={pageInput}
							onChange={(e) => setPageInput(e.target.value)}
							onBlur={() => setPageInput(String(current))}
							inputMode="numeric"
							aria-label="Current page"
							className="h-7 w-12 rounded-md border bg-background text-center outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
						/>
						<span className="text-muted-foreground">of {doc.numPages}</span>
					</form>
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label="Next page"
						disabled={current >= doc.numPages}
						onClick={() => goTo(current + 1)}
					>
						<CaretDownIcon />
					</Button>
				</div>
				<div className="ml-auto flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label="Zoom out"
						disabled={scale <= ZOOM_STEPS[0] + 0.01}
						onClick={() => zoomBy(-1)}
					>
						<MagnifyingGlassMinusIcon />
					</Button>
					<button
						type="button"
						onClick={() => setZoom("fit")}
						title="Fit to width"
						className="h-7 min-w-14 rounded-md px-1.5 font-mono text-xs tabular-nums text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					>
						{Math.round(scale * 100)}%
					</button>
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label="Zoom in"
						disabled={scale >= ZOOM_STEPS[ZOOM_STEPS.length - 1] - 0.01}
						onClick={() => zoomBy(1)}
					>
						<MagnifyingGlassPlusIcon />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label="Fit to width"
						aria-pressed={zoom === "fit"}
						className="aria-pressed:bg-muted aria-pressed:text-foreground"
						onClick={() => setZoom("fit")}
					>
						<ArrowsOutLineHorizontalIcon />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label="Rotate clockwise"
						onClick={() => setRotation((value) => (value + 90) % 360)}
					>
						<ArrowClockwiseIcon />
					</Button>
				</div>
			</div>
			<div className="flex min-h-0 flex-1">
				<Thumbnails
					pdfjs={pdfjs}
					doc={doc}
					sizes={sizes}
					rotation={rotation}
					current={current}
					onPick={goTo}
				/>
				<div
					ref={scrollRef}
					onScroll={updateCurrent}
					className="relative min-h-0 flex-1 overflow-auto overscroll-contain bg-muted/60"
					style={{ padding: PAGE_PADDING }}
				>
					<div
						className="mx-auto flex flex-col items-center"
						style={{ gap: PAGE_GAP }}
					>
						{pageNumbers.map((pageNumber) => (
							<PdfPage
								key={pageNumber}
								pdfjs={pdfjs}
								doc={doc}
								pageNumber={pageNumber}
								scale={scale}
								rotation={rotation}
								width={Math.round(rotated[pageNumber - 1].width * scale)}
								height={Math.round(rotated[pageNumber - 1].height * scale)}
								root={scrollRef}
								withText
								className="bg-white shadow-md ring-1 ring-black/5"
							/>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

function Thumbnails({
	pdfjs,
	doc,
	sizes,
	rotation,
	current,
	onPick,
}: {
	pdfjs: Pdfjs;
	doc: PDFDocumentProxy;
	sizes: Array<PageSize>;
	rotation: number;
	current: number;
	onPick: (page: number) => void;
}) {
	const scrollRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		scrollRef.current
			?.querySelector(`[data-page="${current}"]`)
			?.scrollIntoView({ block: "nearest" });
	}, [current]);
	return (
		<div
			ref={scrollRef}
			className="hidden w-40 shrink-0 overflow-y-auto border-r bg-muted/30 p-3 lg:block"
		>
			<div className="flex flex-col gap-3">
				{sizes.map((size, index) => {
					const pageNumber = index + 1;
					const landscape = rotation % 180 !== 0;
					const baseWidth = landscape ? size.height : size.width;
					const baseHeight = landscape ? size.width : size.height;
					const scale = THUMB_WIDTH / baseWidth;
					return (
						<button
							key={pageNumber}
							type="button"
							data-page={pageNumber}
							onClick={() => onPick(pageNumber)}
							aria-label={`Go to page ${pageNumber}`}
							aria-current={pageNumber === current ? "page" : undefined}
							className="group/thumb flex flex-col items-center gap-1 rounded-md p-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
						>
							<PdfPage
								pdfjs={pdfjs}
								doc={doc}
								pageNumber={pageNumber}
								scale={scale}
								rotation={rotation}
								width={THUMB_WIDTH}
								height={Math.round(baseHeight * scale)}
								root={scrollRef}
								className={cn(
									"bg-white ring-1 ring-black/10 transition-[box-shadow]",
									pageNumber === current
										? "ring-2 ring-primary"
										: "group-hover/thumb:ring-foreground/40",
								)}
							/>
							<span
								className={cn(
									"font-mono text-[10px] tabular-nums",
									pageNumber === current
										? "font-semibold text-foreground"
										: "text-muted-foreground",
								)}
							>
								{pageNumber}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}

function PdfPage({
	pdfjs,
	doc,
	pageNumber,
	scale,
	rotation,
	width,
	height,
	root,
	withText = false,
	className,
}: {
	pdfjs: Pdfjs;
	doc: PDFDocumentProxy;
	pageNumber: number;
	scale: number;
	rotation: number;
	width: number;
	height: number;
	root: React.RefObject<HTMLDivElement | null>;
	withText?: boolean;
	className?: string;
}) {
	const hostRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const textRef = useRef<HTMLDivElement>(null);
	const [visible, setVisible] = useState(false);
	const [rendered, setRendered] = useState(false);

	useEffect(() => {
		const host = hostRef.current;
		if (!host) return;
		const observer = new IntersectionObserver(
			([entry]) => setVisible(entry.isIntersecting),
			{ root: root.current, rootMargin: "800px 0px" },
		);
		observer.observe(host);
		return () => observer.disconnect();
	}, [root]);

	useEffect(() => {
		const canvas = canvasRef.current;
		const textHost = textRef.current;
		if (!canvas) return;
		if (!visible) {
			setRendered(false);
			canvas.width = 0;
			canvas.height = 0;
			return;
		}
		let cancelled = false;
		let renderTask: { cancel: () => void } | null = null;
		void (async () => {
			const page = await doc.getPage(pageNumber);
			if (cancelled) return;
			const viewport = page.getViewport({
				scale,
				rotation: (page.rotate + rotation) % 360,
			});
			const ratio = window.devicePixelRatio || 1;
			canvas.width = Math.floor(viewport.width * ratio);
			canvas.height = Math.floor(viewport.height * ratio);
			const context = canvas.getContext("2d");
			if (!context) return;
			const task = page.render({
				canvas,
				canvasContext: context,
				viewport,
				transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
			});
			renderTask = task;
			try {
				await task.promise;
			} catch (e) {
				if (!cancelled) console.error(e);
				return;
			}
			if (cancelled) return;
			setRendered(true);
			if (withText && textHost) {
				textHost.replaceChildren();
				textHost.style.setProperty("--scale-factor", String(viewport.scale));
				const layer = new pdfjs.TextLayer({
					textContentSource: page.streamTextContent(),
					container: textHost,
					viewport,
				});
				await layer.render().catch(() => undefined);
			}
		})();
		return () => {
			cancelled = true;
			renderTask?.cancel();
			textHost?.replaceChildren();
		};
	}, [visible, doc, pageNumber, scale, rotation, withText, pdfjs]);

	return (
		<div
			ref={hostRef}
			className={cn("pdf-page relative shrink-0 overflow-hidden", className)}
			style={{ width, height, "--scale-factor": scale } as React.CSSProperties}
			data-page-number={pageNumber}
		>
			<canvas
				ref={canvasRef}
				className={cn(
					"block h-full w-full transition-opacity",
					rendered ? "opacity-100" : "opacity-0",
				)}
				aria-label={`Page ${pageNumber}`}
			/>
			{withText && <div ref={textRef} className="textLayer" />}
		</div>
	);
}
