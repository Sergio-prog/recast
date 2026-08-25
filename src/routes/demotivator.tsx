import {
	ArrowCounterClockwiseIcon,
	CheckIcon,
	CopyIcon,
	DownloadSimpleIcon,
	StackMinusIcon,
	StackPlusIcon,
} from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Dropzone } from "@/components/dropzone";
import { Button } from "@/components/ui/button";
import {
	CAPTION_SCALE,
	DEMOTIVATOR_FONT,
	type DemotivatorFrame,
	type LineKind,
	MAX_TEXT_SCALE,
	MIN_TEXT_SCALE,
	renderDemotivator,
	SUBCAPTION_SCALE,
	type TextHit,
} from "@/lib/demotivator";

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
	const [copied, setCopied] = useState(false);
	const [displayScale, setDisplayScale] = useState(1);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const hitsRef = useRef<Array<TextHit>>([]);
	const resizeStart = useRef<{
		clientY: number;
		scale: number;
		boxHeight: number;
	} | null>(null);

	const selectedFrame = selected
		? frames.find((frame) => frame.id === selected.frameId)
		: null;
	const selectedHit = selected
		? hitsRef.current.find(
				(hit) =>
					hit.frameId === selected.frameId && hit.line === selected.line,
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
		const canvas = canvasRef.current;
		if (!canvas || !image) return;
		const result = renderDemotivator(image.el, frames, {
			placeholders: true,
			hideLine: selected,
		});
		hitsRef.current = result.hits;
		canvas.width = result.canvas.width;
		canvas.height = result.canvas.height;
		canvas.getContext("2d")?.drawImage(result.canvas, 0, 0);
		setDisplayScale(canvas.clientWidth / canvas.width || 1);
	}, [image, frames, selected]);

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
		return renderDemotivator(image.el, frames, { placeholders: false }).canvas;
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

	return (
		<main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-14">
			<p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
				Studio · Demotivator
			</p>
			<h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
				Black frame. White serif. Zero motivation.
			</h1>
			<p className="mt-4 max-w-xl text-muted-foreground">
				Drop an image, then click a caption on the canvas to edit it — drag the
				corner handle to resize. Every loop wraps the whole demotivator in
				another one. Rendered in your browser — nothing is uploaded.
			</p>

			{!image ? (
				<Dropzone
					className="mt-8"
					onFiles={loadFile}
					label="Drop an image here"
					hint="or click to browse — JPG, PNG, WebP or GIF"
					accept="image/*"
					multiple={false}
				/>
			) : (
				<div className="mt-8">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<p className="truncate font-mono text-xs uppercase tracking-widest text-muted-foreground">
							{image.name}
						</p>
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
							<button
								type="button"
								onClick={() => {
									setImage(null);
									setSelected(null);
									setFrames(initialFrames());
								}}
								aria-label="Start over"
								className={ICON_BUTTON_CLASSES}
							>
								<ArrowCounterClockwiseIcon className="size-4" />
							</button>
							<Button size="sm" onClick={download}>
								<DownloadSimpleIcon />
								PNG
							</Button>
						</div>
					</div>
					<div className="mt-3 rounded-xl border bg-black/95 p-3 sm:p-6">
						<div className="relative mx-auto w-fit max-w-full">
							<canvas
								ref={canvasRef}
								onClick={handleCanvasClick}
								className="block h-auto max-h-[80svh] w-auto max-w-full cursor-text"
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
									<input
										ref={inputRef}
										value={selectedFrame[selected.line].text}
										onChange={(e) =>
											updateLine(selected, { text: e.target.value })
										}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === "Escape") {
												setSelected(null);
											}
										}}
										onBlur={(e) => {
											if (
												!e.relatedTarget ||
												!(e.currentTarget.parentElement?.contains(
													e.relatedTarget,
												) ?? false)
											) {
												setSelected(null);
											}
										}}
										placeholder={
											selected.line === "caption" ? "Caption" : "smaller line"
										}
										aria-label="Edit caption"
										spellCheck={false}
										className="size-full border border-dashed border-white/60 bg-transparent text-center text-white caret-white outline-none placeholder:text-white/30"
										style={{
											fontFamily: DEMOTIVATOR_FONT,
											fontSize: selectedHit.fontPx * displayScale,
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
						Click a caption to edit it in place. Drag the white corner handle
						to change its size. Empty captions are skipped in the export.
					</p>
				</div>
			)}
		</main>
	);
}
