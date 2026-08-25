import {
	ArrowCounterClockwiseIcon,
	CheckIcon,
	CopyIcon,
	DownloadSimpleIcon,
	PlusIcon,
	StackPlusIcon,
	TrashIcon,
	XIcon,
} from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Dropzone } from "@/components/dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
	CAPTION_SCALE,
	type DemotivatorFrame,
	MAX_TEXT_SCALE,
	MIN_TEXT_SCALE,
	renderDemotivator,
	SUBCAPTION_SCALE,
	type TextLayer,
} from "@/lib/demotivator";

export const Route = createFileRoute("/demotivator")({
	head: () => ({ meta: [{ title: "Demotivator — Recast" }] }),
	component: DemotivatorPage,
});

const ICON_BUTTON_CLASSES =
	"rounded-md border bg-card p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50";

let layerCounter = 0;

function makeLayer(text: string, scale: number): TextLayer {
	layerCounter += 1;
	return { id: `layer-${layerCounter}`, text, scale };
}

function makeFrame(caption: string, subcaption: string): DemotivatorFrame {
	layerCounter += 1;
	return {
		id: `frame-${layerCounter}`,
		layers: [
			makeLayer(caption, CAPTION_SCALE),
			makeLayer(subcaption, SUBCAPTION_SCALE),
		],
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

function DemotivatorPage() {
	const [image, setImage] = useState<LoadedImage | null>(null);
	const [frames, setFrames] = useState<Array<DemotivatorFrame>>(initialFrames);
	const [copied, setCopied] = useState(false);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const resultRef = useRef<HTMLCanvasElement | null>(null);

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
		const result = renderDemotivator(image.el, frames);
		resultRef.current = result;
		canvas.width = result.width;
		canvas.height = result.height;
		canvas.getContext("2d")?.drawImage(result, 0, 0);
	}, [image, frames]);

	const updateLayer = (
		frameId: string,
		layerId: string,
		patch: Partial<TextLayer>,
	) => {
		setFrames((prev) =>
			prev.map((frame) =>
				frame.id === frameId
					? {
							...frame,
							layers: frame.layers.map((layer) =>
								layer.id === layerId ? { ...layer, ...patch } : layer,
							),
						}
					: frame,
			),
		);
	};

	const removeLayer = (frameId: string, layerId: string) => {
		setFrames((prev) =>
			prev.map((frame) =>
				frame.id === frameId
					? {
							...frame,
							layers: frame.layers.filter((layer) => layer.id !== layerId),
						}
					: frame,
			),
		);
	};

	const addLayer = (frameId: string) => {
		setFrames((prev) =>
			prev.map((frame) =>
				frame.id === frameId
					? {
							...frame,
							layers: [...frame.layers, makeLayer("", SUBCAPTION_SCALE)],
						}
					: frame,
			),
		);
	};

	const addLoop = () => {
		setFrames((prev) => {
			const [caption, subcaption] =
				LOOP_CAPTIONS[Math.min(prev.length - 1, LOOP_CAPTIONS.length - 1)];
			return [...prev, makeFrame(caption, subcaption)];
		});
	};

	const removeFrame = (frameId: string) => {
		setFrames((prev) =>
			prev.length > 1 ? prev.filter((frame) => frame.id !== frameId) : prev,
		);
	};

	const download = () => {
		resultRef.current?.toBlob((blob) => {
			if (!blob) return;
			const a = document.createElement("a");
			a.href = URL.createObjectURL(blob);
			a.download = "demotivator.png";
			a.click();
			URL.revokeObjectURL(a.href);
		}, "image/png");
	};

	const copy = () => {
		resultRef.current?.toBlob(async (blob) => {
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
				Drop an image, write the caption, stack as many nested frames as the
				joke needs. Rendered in your browser — nothing is uploaded.
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
				<div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
					<div className="lg:sticky lg:top-20">
						<div className="flex items-center justify-between gap-2">
							<p className="truncate font-mono text-xs uppercase tracking-widest text-muted-foreground">
								{image.name}
							</p>
							<div className="flex items-center gap-1.5">
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
						<div className="mt-3 overflow-hidden rounded-xl border bg-black/95 p-3 sm:p-5">
							<canvas
								ref={canvasRef}
								className="mx-auto block h-auto max-h-[75svh] w-auto max-w-full"
								aria-label="Demotivator preview"
							/>
						</div>
					</div>

					<div className="flex flex-col gap-4">
						{frames.map((frame, index) => (
							<FramePanel
								key={frame.id}
								frame={frame}
								index={index}
								total={frames.length}
								onUpdateLayer={updateLayer}
								onRemoveLayer={removeLayer}
								onAddLayer={addLayer}
								onRemoveFrame={removeFrame}
							/>
						))}
						<Button variant="outline" onClick={addLoop}>
							<StackPlusIcon />
							Add a loop — frame the frame
						</Button>
					</div>
				</div>
			)}
		</main>
	);
}

function FramePanel({
	frame,
	index,
	total,
	onUpdateLayer,
	onRemoveLayer,
	onAddLayer,
	onRemoveFrame,
}: {
	frame: DemotivatorFrame;
	index: number;
	total: number;
	onUpdateLayer: (
		frameId: string,
		layerId: string,
		patch: Partial<TextLayer>,
	) => void;
	onRemoveLayer: (frameId: string, layerId: string) => void;
	onAddLayer: (frameId: string) => void;
	onRemoveFrame: (frameId: string) => void;
}) {
	return (
		<Card>
			<CardContent className="flex flex-col gap-3">
				<div className="flex items-center justify-between gap-2">
					<span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
						{index === 0
							? total > 1
								? "Frame 1 · inner"
								: "Frame"
							: `Frame ${index + 1}`}
					</span>
					{total > 1 && (
						<button
							type="button"
							onClick={() => onRemoveFrame(frame.id)}
							aria-label={`Remove frame ${index + 1}`}
							className={ICON_BUTTON_CLASSES}
						>
							<XIcon className="size-4" />
						</button>
					)}
				</div>
				{frame.layers.map((layer, layerIndex) => (
					<div key={layer.id} className="flex flex-col gap-1.5">
						<div className="flex items-center gap-1.5">
							<Input
								value={layer.text}
								onChange={(e) =>
									onUpdateLayer(frame.id, layer.id, { text: e.target.value })
								}
								placeholder={layerIndex === 0 ? "CAPTION" : "smaller line"}
								aria-label={`Frame ${index + 1} text layer ${layerIndex + 1}`}
							/>
							<button
								type="button"
								onClick={() => onRemoveLayer(frame.id, layer.id)}
								aria-label="Delete text layer"
								className={ICON_BUTTON_CLASSES}
							>
								<TrashIcon className="size-4" />
							</button>
						</div>
						<div className="flex items-center gap-2 px-0.5">
							<span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
								Size
							</span>
							<Slider
								aria-label="Text size"
								value={[layer.scale]}
								min={MIN_TEXT_SCALE}
								max={MAX_TEXT_SCALE}
								step={0.005}
								onValueChange={(value) =>
									onUpdateLayer(frame.id, layer.id, {
										scale: Array.isArray(value) ? value[0] : value,
									})
								}
							/>
						</div>
					</div>
				))}
				<Button
					variant="ghost"
					size="sm"
					className="self-start"
					onClick={() => onAddLayer(frame.id)}
				>
					<PlusIcon />
					Add text layer
				</Button>
			</CardContent>
		</Card>
	);
}
