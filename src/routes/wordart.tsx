import {
	CheckIcon,
	CopyIcon,
	DownloadSimpleIcon,
	FilmSlateIcon,
} from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebounced } from "@/hooks/use-debounced";
import {
	createFireSim,
	encodeFireGif,
	paintFire,
	stepFire,
	textMask,
} from "@/lib/burning-text";
import { renderWordArt, WORDART_STYLES, type WordArtStyle } from "@/lib/wordart";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/wordart")({
	head: () => ({ meta: [{ title: "Word Art — Recast" }] }),
	component: WordArtPage,
});

const CHECKERBOARD =
	"bg-[linear-gradient(45deg,var(--color-muted)_25%,transparent_25%,transparent_75%,var(--color-muted)_75%),linear-gradient(45deg,var(--color-muted)_25%,transparent_25%,transparent_75%,var(--color-muted)_75%)] bg-[size:16px_16px] bg-[position:0_0,8px_8px]";

function downloadBlob(blob: Blob, filename: string) {
	const a = document.createElement("a");
	a.href = URL.createObjectURL(blob);
	a.download = filename;
	a.click();
	URL.revokeObjectURL(a.href);
}

function WordArtPage() {
	return (
		<main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-14">
			<p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
				Studio · Word Art
			</p>
			<h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
				Type it like it&#39;s 1997.
			</h1>
			<p className="mt-4 max-w-xl text-muted-foreground">
				Classic Word Art styles and a burning-text generator. Rendered in your
				browser — export as transparent PNG or animated GIF.
			</p>
			<Tabs defaultValue="wordart" className="mt-8">
				<TabsList className="w-full sm:w-fit">
					<TabsTrigger value="wordart" className="px-4">
						Word Art
					</TabsTrigger>
					<TabsTrigger value="fire" className="px-4">
						Burning text
					</TabsTrigger>
				</TabsList>
				<TabsContent value="wordart">
					<WordArtPanel />
				</TabsContent>
				<TabsContent value="fire">
					<BurningPanel />
				</TabsContent>
			</Tabs>
		</main>
	);
}

function StyleSwatch({
	style,
	selected,
	onSelect,
}: {
	style: WordArtStyle;
	selected: boolean;
	onSelect: () => void;
}) {
	const ref = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = ref.current;
		if (!canvas) return;
		const art = renderWordArt("WordArt", style, 52);
		canvas.width = art.width;
		canvas.height = art.height;
		canvas.getContext("2d")?.drawImage(art, 0, 0);
	}, [style]);

	return (
		<button
			type="button"
			onClick={onSelect}
			aria-label={style.label}
			aria-pressed={selected}
			className={cn(
				"flex h-20 items-center justify-center rounded-lg border bg-card p-2 transition-colors hover:border-primary/60",
				selected && "border-primary ring-[3px] ring-ring/50",
			)}
		>
			<canvas ref={ref} className="h-full w-auto max-w-full object-contain" />
		</button>
	);
}

function WordArtPanel() {
	const [text, setText] = useState("Your Text Here");
	const [styleId, setStyleId] = useState(WORDART_STYLES[0].id);
	const [copied, setCopied] = useState(false);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const resultRef = useRef<HTMLCanvasElement | null>(null);
	const debouncedText = useDebounced(text, 120);
	const style =
		WORDART_STYLES.find((s) => s.id === styleId) ?? WORDART_STYLES[0];

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const art = renderWordArt(debouncedText || "Your Text Here", style);
		resultRef.current = art;
		canvas.width = art.width;
		canvas.height = art.height;
		canvas.getContext("2d")?.drawImage(art, 0, 0);
	}, [debouncedText, style]);

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
		<Card className="mt-2">
			<CardContent className="flex flex-col gap-5">
				<Input
					value={text}
					onChange={(e) => setText(e.target.value)}
					placeholder="Your Text Here"
					aria-label="Word Art text"
					className="h-11 text-base"
				/>
				<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
					{WORDART_STYLES.map((s) => (
						<StyleSwatch
							key={s.id}
							style={s}
							selected={s.id === styleId}
							onSelect={() => setStyleId(s.id)}
						/>
					))}
				</div>
				<div
					className={cn(
						"flex items-center justify-center overflow-hidden rounded-xl border p-6",
						CHECKERBOARD,
					)}
				>
					<canvas
						ref={canvasRef}
						className="h-auto max-h-72 w-auto max-w-full"
						aria-label="Word Art preview"
					/>
				</div>
				<div className="flex items-center gap-2">
					<Button
						onClick={() =>
							resultRef.current?.toBlob(
								(blob) => blob && downloadBlob(blob, "wordart.png"),
								"image/png",
							)
						}
					>
						<DownloadSimpleIcon />
						Download PNG
					</Button>
					<Button variant="outline" onClick={copy}>
						{copied ? <CheckIcon /> : <CopyIcon />}
						{copied ? "Copied" : "Copy image"}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

function BurningPanel() {
	const [text, setText] = useState("on fire");
	const [cooling, setCooling] = useState(7);
	const [encoding, setEncoding] = useState(false);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const debouncedText = useDebounced(text, 200);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const { mask, width, height } = textMask(debouncedText || "on fire");
		const sim = createFireSim(mask, width, height);
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const frame = ctx.createImageData(width, height);
		let raf = 0;
		let last = 0;
		let active = true;
		const loop = (now: number) => {
			if (!active) return;
			raf = requestAnimationFrame(loop);
			if (now - last < 33) return;
			last = now;
			stepFire(sim, cooling);
			stepFire(sim, cooling);
			paintFire(sim, frame.data);
			ctx.putImageData(frame, 0, 0);
		};
		raf = requestAnimationFrame(loop);
		return () => {
			active = false;
			cancelAnimationFrame(raf);
		};
	}, [debouncedText, cooling]);

	const exportGif = () => {
		setEncoding(true);
		setTimeout(() => {
			try {
				const { mask, width, height } = textMask(debouncedText || "on fire");
				const sim = createFireSim(mask, width, height);
				const bytes = encodeFireGif(sim, cooling);
				downloadBlob(
					new Blob([bytes as BlobPart], { type: "image/gif" }),
					"burning-text.gif",
				);
			} catch {
				toast.error("GIF export failed — try shorter text");
			} finally {
				setEncoding(false);
			}
		}, 30);
	};

	const exportPng = () => {
		canvasRef.current?.toBlob(
			(blob) => blob && downloadBlob(blob, "burning-text.png"),
			"image/png",
		);
	};

	return (
		<Card className="mt-2">
			<CardContent className="flex flex-col gap-5">
				<div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
					<Input
						value={text}
						onChange={(e) => setText(e.target.value)}
						placeholder="on fire"
						aria-label="Burning text"
						className="h-11 text-base"
					/>
					<div>
						<div className="flex items-baseline justify-between">
							<span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
								Flame height
							</span>
						</div>
						<Slider
							className="mt-2"
							aria-label="Flame height"
							value={[16 - cooling]}
							min={2}
							max={13}
							step={1}
							onValueChange={(value) =>
								setCooling(16 - (Array.isArray(value) ? value[0] : value))
							}
						/>
					</div>
				</div>
				<div className="overflow-hidden rounded-xl border bg-black">
					<canvas
						ref={canvasRef}
						className="mx-auto block h-auto max-h-80 w-auto max-w-full"
						aria-label="Burning text preview"
					/>
				</div>
				<div className="flex items-center gap-2">
					<Button onClick={exportGif} disabled={encoding}>
						{encoding ? <Spinner /> : <FilmSlateIcon />}
						{encoding ? "Encoding…" : "Export GIF"}
					</Button>
					<Button variant="outline" onClick={exportPng}>
						<DownloadSimpleIcon />
						PNG frame
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
