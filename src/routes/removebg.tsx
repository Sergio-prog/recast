import {
	ArrowCounterClockwiseIcon,
	DownloadSimpleIcon,
	SparkleIcon,
} from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Dropzone } from "@/components/dropzone";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/removebg")({
	head: () => ({ meta: [{ title: "Remove background — Recast" }] }),
	component: RemoveBgPage,
});

const CHECKERBOARD =
	"bg-[linear-gradient(45deg,var(--color-muted)_25%,transparent_25%,transparent_75%,var(--color-muted)_75%),linear-gradient(45deg,var(--color-muted)_25%,transparent_25%,transparent_75%,var(--color-muted)_75%)] bg-[size:16px_16px] bg-[position:0_0,8px_8px]";

function RemoveBgPage() {
	const [file, setFile] = useState<File | null>(null);
	const [originalUrl, setOriginalUrl] = useState<string | null>(null);
	const [resultUrl, setResultUrl] = useState<string | null>(null);
	const [tolerance, setTolerance] = useState(32);
	const [busy, setBusy] = useState(false);
	const requestId = useRef(0);

	useEffect(() => {
		return () => {
			if (originalUrl) URL.revokeObjectURL(originalUrl);
		};
	}, [originalUrl]);

	useEffect(() => {
		return () => {
			if (resultUrl) URL.revokeObjectURL(resultUrl);
		};
	}, [resultUrl]);

	const process = async (target: File, tol: number) => {
		requestId.current += 1;
		const id = requestId.current;
		setBusy(true);
		try {
			const form = new FormData();
			form.append("file", target);
			form.append("tolerance", String(tol));
			const response = await fetch("/api/removebg", {
				method: "POST",
				body: form,
			});
			if (id !== requestId.current) return;
			if (!response.ok) {
				toast.error(await response.text());
				return;
			}
			setResultUrl(URL.createObjectURL(await response.blob()));
		} catch {
			if (id === requestId.current) {
				toast.error("The image could not be processed — try again");
			}
		} finally {
			if (id === requestId.current) setBusy(false);
		}
	};

	const loadFile = (files: Array<File>) => {
		const image = files.find((f) => f.type.startsWith("image/"));
		if (!image) {
			toast.error("Drop an image file — JPG, PNG or WebP");
			return;
		}
		setFile(image);
		setOriginalUrl(URL.createObjectURL(image));
		setResultUrl(null);
		void process(image, tolerance);
	};

	const reset = () => {
		requestId.current += 1;
		setFile(null);
		setOriginalUrl(null);
		setResultUrl(null);
		setBusy(false);
	};

	const download = () => {
		if (!resultUrl || !file) return;
		const a = document.createElement("a");
		a.href = resultUrl;
		a.download = `${file.name.replace(/\.[^.]+$/, "")}-nobg.png`;
		a.click();
	};

	return (
		<main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-14">
			<p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
				Studio · Remove background
			</p>
			<h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
				Cut the background, keep the subject.
			</h1>
			<p className="mt-4 max-w-xl text-muted-foreground">
				A fast color-based cutout — no AI, no third parties. It works best on
				flat, even backgrounds like product shots, logos and scans. Heavily
				rate limited, so batch your tries.
			</p>

			{!file ? (
				<Dropzone
					className="mt-8"
					onFiles={loadFile}
					label="Drop an image here"
					hint="or click to browse — JPG, PNG or WebP up to 25 MB"
					accept="image/*"
					multiple={false}
				/>
			) : (
				<div className="mt-8 flex flex-col gap-5">
					<div className="flex flex-wrap items-end justify-between gap-4">
						<div className="w-full max-w-xs">
							<div className="flex items-baseline justify-between">
								<span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
									Tolerance
								</span>
								<span className="font-mono text-xs tabular-nums">
									{tolerance}
								</span>
							</div>
							<Slider
								className="mt-1.5"
								aria-label="Tolerance"
								value={[tolerance]}
								min={5}
								max={120}
								step={1}
								onValueChange={(value) =>
									setTolerance(Array.isArray(value) ? value[0] : value)
								}
								onValueCommitted={() => file && void process(file, tolerance)}
							/>
							<div className="mt-1 flex justify-between text-[9px] leading-none text-muted-foreground">
								<span>keep more</span>
								<span>cut more</span>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Button variant="outline" onClick={reset}>
								<ArrowCounterClockwiseIcon />
								New image
							</Button>
							<Button onClick={download} disabled={!resultUrl || busy}>
								<DownloadSimpleIcon />
								Download PNG
							</Button>
						</div>
					</div>
					<div className="grid gap-4 sm:grid-cols-2">
						<figure>
							<figcaption className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
								Original
							</figcaption>
							<div className="mt-2 overflow-hidden rounded-xl border bg-card">
								{originalUrl && (
									<img
										src={originalUrl}
										alt="Original upload"
										className="mx-auto max-h-[60svh] w-auto max-w-full"
									/>
								)}
							</div>
						</figure>
						<figure>
							<figcaption className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
								<SparkleIcon className="size-3.5" />
								Result
							</figcaption>
							<div
								className={cn(
									"mt-2 flex min-h-32 items-center justify-center overflow-hidden rounded-xl border",
									CHECKERBOARD,
								)}
							>
								{busy ? (
									<Spinner className="size-6 text-muted-foreground" />
								) : resultUrl ? (
									<img
										src={resultUrl}
										alt="Background removed"
										className="mx-auto max-h-[60svh] w-auto max-w-full"
									/>
								) : (
									<p className="p-6 text-sm text-muted-foreground">
										Adjust the tolerance and run again.
									</p>
								)}
							</div>
						</figure>
					</div>
				</div>
			)}
		</main>
	);
}
