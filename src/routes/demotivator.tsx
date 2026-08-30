import {
	ArrowCounterClockwiseIcon,
	CheckIcon,
	CopyIcon,
	DownloadSimpleIcon,
	PlusIcon,
	StackMinusIcon,
	StackPlusIcon,
} from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
	ASPECT_PRESETS,
	CAPTION_SCALE,
	DEFAULT_DEMOTIVATOR_FONT_ID,
	DEMOTIVATOR_FONT,
	DEMOTIVATOR_FONTS,
	type DemotivatorFontId,
	type DemotivatorFrame,
	getDemotivatorFont,
	type LineKind,
	lineHeightFor,
	MAX_TEXT_SCALE,
	MIN_TEXT_SCALE,
	renderDemotivator,
	SUBCAPTION_SCALE,
	type TextHit,
} from "@/lib/demotivator";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/demotivator")({
	head: () => ({ meta: [{ title: "Demotivator — Recast" }] }),
	component: DemotivatorPage,
});

const ICON_BUTTON_CLASSES =
	"rounded-md border bg-card p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50";

let frameCounter = 0;

function makeFrame(caption: string, subcaption: string): DemotivatorFrame {
	frameCounter += 1;
	return {
		id: `frame-${frameCounter}`,
		caption: { text: caption, scale: CAPTION_SCALE },
		subcaption: { text: subcaption, scale: SUBCAPTION_SCALE },
	};
}

const initialFrames = () => [makeFrame("MOTIVATION", "not found")];

const LOOP_CAPTIONS: Array<[string, string]> = [
	["DEMOTIVATOR", "we heard you like demotivators"],
	["DEEPER", "so we put a frame around your frame"],
	["STILL GOING", "at this point it's a lifestyle"],
	["THE ABYSS", "it also gazes into you"],
];

type LoadedImage = { el: HTMLImageElement; name: string };
type Selection = { frameId: string; line: LineKind };

function DemotivatorPage() {
	const [image, setImage] = useState<LoadedImage | null>(null);
	const [frames, setFrames] = useState<Array<DemotivatorFrame>>(initialFrames);
	const [selected, setSelected] = useState<Selection | null>(null);
	const [aspectId, setAspectId] = useState("auto");
	const [fontId, setFontId] = useState<DemotivatorFontId>(
		DEFAULT_DEMOTIVATOR_FONT_ID,
	);
	const [fontsReady, setFontsReady] = useState(false);
	const [exportSize, setExportSize] = useState<[number, number] | null>(null);
	const [copied, setCopied] = useState(false);
	const [displayScale, setDisplayScale] = useState(1);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const hitsRef = useRef<Array<TextHit>>([]);
	const resizeStart = useRef<{
		clientY: number;
		scale: number;
		boxHeight: number;
	} | null>(null);

	const aspect =
		ASPECT_PRESETS.find((preset) => preset.id === aspectId)?.value ?? null;
	const selectedFont = getDemotivatorFont(fontId);
	const selectedFrame = selected
		? frames.find((frame) => frame.id === selected.frameId)
		: null;
	const selectedHit = selected
		? hitsRef.current.find(
				(hit) => hit.frameId === selected.frameId && hit.line === selected.line,
			)
		: null;

	const loadFile = (files: Array<File>) => {
		const file = files.find((f) => f.type.startsWith("image/"));
		if (!file) {
			toast.error("Drop an image file — JPG, PNG, WebP or GIF");
			return;
		}
		const url = URL.createObjectURL(file);
		const el = new Image();
		el.onload = () => {
			setImage({ el, name: file.name });
			URL.revokeObjectURL(url);
		};
		el.onerror = () => {
			toast.error("This image could not be opened");
			URL.revokeObjectURL(url);
		};
		el.src = url;
	};

	useEffect(() => {
		void document.fonts.ready.then(() => setFontsReady(true));
	}, []);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || !image || !fontsReady) return;
		const preview = renderDemotivator(image.el, frames, {
			placeholders: true,
			editorChrome: true,
			hideLine: selected,
			aspect,
			fontId,
		});
		hitsRef.current = preview.hits;
		canvas.width = preview.canvas.width;
		canvas.height = preview.canvas.height;
		canvas.getContext("2d")?.drawImage(preview.canvas, 0, 0);
		setDisplayScale(canvas.clientWidth / canvas.width || 1);
		const output = renderDemotivator(image.el, frames, { aspect, fontId });
		setExportSize([output.canvas.width, output.canvas.height]);
	}, [image, frames, selected, aspect, fontId, fontsReady]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || !image) return;
		const observer = new ResizeObserver(() => {
			setDisplayScale(canvas.clientWidth / canvas.width || 1);
		});
		observer.observe(canvas);
		return () => observer.disconnect();
	}, [image]);

	useEffect(() => {
		if (selected) inputRef.current?.focus();
	}, [selected]);

	const updateLine = (
		selection: Selection,
		patch: Partial<{ text: string; scale: number }>,
	) => {
		setFrames((prev) =>
			prev.map((frame) =>
				frame.id === selection.frameId
					? {
							...frame,
							[selection.line]: { ...frame[selection.line], ...patch },
						}
					: frame,
			),
		);
	};

	const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
		const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
		const slack = 8 / displayScale;
		const hit = hitsRef.current.find(
			(h) =>
				x >= h.x - slack &&
				x <= h.x + h.width + slack &&
				y >= h.top - slack &&
				y <= h.top + h.height + slack,
		);
		setSelected(hit ? { frameId: hit.frameId, line: hit.line } : null);
	};

	const handleResizeDrag = (e: React.PointerEvent) => {
		const start = resizeStart.current;
		const canvas = canvasRef.current;
		if (!start || !canvas || !selected) return;
		const rect = canvas.getBoundingClientRect();
		const dy = ((e.clientY - start.clientY) / rect.height) * canvas.height;
		const factor = (start.boxHeight + dy) / start.boxHeight;
		const scale = Math.min(
			MAX_TEXT_SCALE,
			Math.max(MIN_TEXT_SCALE, start.scale * factor),
		);
		updateLine(selected, { scale });
	};

	const addLoop = () => {
		setSelected(null);
		setFrames((prev) => {
			const [caption, subcaption] =
				LOOP_CAPTIONS[Math.min(prev.length - 1, LOOP_CAPTIONS.length - 1)];
			return [...prev, makeFrame(caption, subcaption)];
		});
	};

	const removeLoop = () => {
		setSelected(null);
		setFrames((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
	};

	const exportCanvas = () => {
		if (!image) return null;
		return renderDemotivator(image.el, frames, { aspect, fontId }).canvas;
	};

	const download = () => {
		exportCanvas()?.toBlob((blob) => {
			if (!blob) return;
			const a = document.createElement("a");
			a.href = URL.createObjectURL(blob);
			a.download = "demotivator.png";
			a.click();
			URL.revokeObjectURL(a.href);
		}, "image/png");
	};

	const copy = () => {
		exportCanvas()?.toBlob(async (blob) => {
			if (!blob) return;
			try {
				await navigator.clipboard.write([
					new ClipboardItem({ "image/png": blob }),
				]);
				setCopied(true);
				setTimeout(() => setCopied(false), 1500);
			} catch {
				toast.error("Copying images is not supported in this browser");
			}
		}, "image/png");
	};

	if (!image) {
		return (
			<main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-14">
				<p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
					Studio · Demotivator
				</p>
				<h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
					Demotivator maker
				</h1>
				<p className="mt-4 max-w-xl text-muted-foreground">
					Drop an image, click the captions on the canvas to edit them, stack
					loops, export a PNG. Rendered in your browser — nothing is uploaded.
				</p>
				<DemotivatorDropzone onFiles={loadFile} />
			</main>
		);
	}

	return (
		<main className="mx-auto w-full max-w-6xl px-4 pb-6 pt-5">
			<div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
				<div className="flex items-baseline gap-3">
					<h1 className="font-display text-xl font-semibold tracking-tight">
						Demotivator maker
					</h1>
					<span className="hidden truncate font-mono text-xs uppercase tracking-widest text-muted-foreground sm:inline">
						{image.name}
					</span>
				</div>
				{exportSize && (
					<span className="font-mono text-xs tabular-nums text-muted-foreground">
						saves as {exportSize[0]} × {exportSize[1]} px
					</span>
				)}
			</div>
			<div className="mt-3 flex flex-wrap items-center justify-between gap-2">
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
						Ratio
					</span>
					<ToggleGroup
						variant="outline"
						spacing={0}
						value={[aspectId]}
						onValueChange={(value) => {
							if (Array.isArray(value) && value.length > 0) {
								setAspectId(String(value[0]));
							}
						}}
					>
						{ASPECT_PRESETS.map((preset) => (
							<ToggleGroupItem
								key={preset.id}
								value={preset.id}
								aria-label={`Aspect ratio ${preset.label}`}
								className="px-2.5 font-mono text-xs"
							>
								{preset.label}
							</ToggleGroupItem>
						))}
					</ToggleGroup>
					<span className="ml-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
						Font
					</span>
					<Select
						value={fontId}
						onValueChange={(value) => {
							if (value) setFontId(value as DemotivatorFontId);
						}}
					>
						<SelectTrigger size="sm" className="min-w-36">
							<SelectValue style={{ fontFamily: selectedFont.family }}>
								{selectedFont.label}
							</SelectValue>
						</SelectTrigger>
						<SelectContent align="start">
							{DEMOTIVATOR_FONTS.map((font) => (
								<SelectItem
									key={font.id}
									value={font.id}
									style={{ fontFamily: font.family }}
								>
									{font.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="flex items-center gap-1.5">
					<Button variant="outline" size="sm" onClick={addLoop}>
						<StackPlusIcon />
						Add loop
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={removeLoop}
						disabled={frames.length <= 1}
					>
						<StackMinusIcon />
						Remove loop
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							setImage(null);
							setSelected(null);
							setAspectId("auto");
							setFontId(DEFAULT_DEMOTIVATOR_FONT_ID);
							setFrames(initialFrames());
						}}
					>
						<ArrowCounterClockwiseIcon />
						Start over
					</Button>
					<button
						type="button"
						onClick={copy}
						aria-label="Copy image"
						className={ICON_BUTTON_CLASSES}
					>
						{copied ? (
							<CheckIcon className="size-4" />
						) : (
							<CopyIcon className="size-4" />
						)}
					</button>
					<Button size="sm" onClick={download}>
						<DownloadSimpleIcon />
						PNG
					</Button>
				</div>
			</div>
			<div className="mt-3 rounded-xl border bg-muted/80 p-3 dark:bg-muted/50">
				<div className="relative mx-auto w-fit max-w-full">
					<canvas
						ref={canvasRef}
						onClick={handleCanvasClick}
						className="block h-auto max-h-[calc(100svh-16rem)] w-auto max-w-full cursor-text ring-1 ring-white shadow-[0_0_0_2px_rgba(0,0,0,0.32)]"
						aria-label="Demotivator canvas — click a caption to edit it"
					/>
					{selected && selectedFrame && selectedHit && (
						<div
							className="absolute"
							style={{
								left: selectedHit.x * displayScale,
								top: selectedHit.top * displayScale,
								width: selectedHit.width * displayScale,
								height: selectedHit.height * displayScale,
							}}
						>
							<textarea
								ref={inputRef}
								value={selectedFrame[selected.line].text}
								onChange={(e) => updateLine(selected, { text: e.target.value })}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === "Escape") {
										setSelected(null);
									}
								}}
								onBlur={(e) => {
									if (
										!e.relatedTarget ||
										!(
											e.currentTarget.parentElement?.contains(
												e.relatedTarget,
											) ?? false
										)
									) {
										setSelected(null);
									}
								}}
								placeholder={
									selected.line === "caption" ? "Caption" : "smaller line"
								}
								aria-label="Edit caption"
								spellCheck={false}
								className="block size-full resize-none overflow-hidden border-0 bg-transparent p-0 text-center text-white caret-white outline-1 -outline-offset-1 outline-dashed outline-white/85 placeholder:text-white/30"
								style={{
									fontFamily: selectedFont.family,
									fontSize: selectedHit.fontPx * displayScale,
									lineHeight: `${lineHeightFor(selectedHit.fontPx) * displayScale}px`,
								}}
							/>
							<button
								type="button"
								aria-label="Drag to resize text"
								onPointerDown={(e) => {
									e.preventDefault();
									e.currentTarget.setPointerCapture(e.pointerId);
									resizeStart.current = {
										clientY: e.clientY,
										scale: selectedFrame[selected.line].scale,
										boxHeight: selectedHit.height * displayScale,
									};
								}}
								onPointerMove={(e) => {
									if (resizeStart.current) handleResizeDrag(e);
								}}
								onPointerUp={(e) => {
									e.currentTarget.releasePointerCapture(e.pointerId);
									resizeStart.current = null;
									inputRef.current?.focus();
								}}
								className="absolute -bottom-1.5 -right-1.5 size-3 cursor-ns-resize rounded-[2px] border border-black bg-white"
							/>
						</div>
					)}
				</div>
			</div>
			<p className="mt-2 text-xs text-muted-foreground">
				The dashed boxes are editable — click one to type, drag the white corner
				handle to resize. Empty captions are skipped in the export.
			</p>
		</main>
	);
}

function DemotivatorDropzone({
	onFiles,
}: {
	onFiles: (files: Array<File>) => void;
}) {
	const [dragging, setDragging] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	return (
		<button
			type="button"
			onClick={() => inputRef.current?.click()}
			onDragOver={(e) => {
				e.preventDefault();
				setDragging(true);
			}}
			onDragLeave={() => setDragging(false)}
			onDrop={(e) => {
				e.preventDefault();
				setDragging(false);
				onFiles(Array.from(e.dataTransfer.files));
			}}
			className={cn(
				"mt-8 block w-full cursor-pointer rounded-xl bg-black p-6 text-white transition-shadow sm:p-10",
				dragging
					? "ring-[3px] ring-ring/60"
					: "hover:ring-[3px] hover:ring-ring/30",
			)}
		>
			<span
				className={cn(
					"flex flex-col items-center gap-2 border-2 px-6 py-14 transition-colors",
					dragging ? "border-white" : "border-white/80",
				)}
			>
				<PlusIcon weight="bold" className="size-6" />
				<span className="font-mono text-sm font-semibold uppercase tracking-[0.25em]">
					Drop an image here
				</span>
			</span>
			<span
				className="mt-6 block text-center text-3xl"
				style={{ fontFamily: DEMOTIVATOR_FONT }}
			>
				YOUR PICTURE
			</span>
			<span
				className="mt-2 block text-center text-sm text-white/70"
				style={{ fontFamily: DEMOTIVATOR_FONT }}
			>
				or click to browse — JPG, PNG, WebP or GIF
			</span>
			<input
				ref={inputRef}
				type="file"
				accept="image/*"
				className="sr-only"
				tabIndex={-1}
				onClick={(e) => e.stopPropagation()}
				onChange={(e) => {
					onFiles(Array.from(e.currentTarget.files ?? []));
					e.currentTarget.value = "";
				}}
			/>
		</button>
	);
}
