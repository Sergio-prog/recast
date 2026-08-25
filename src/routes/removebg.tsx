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
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { type ModelProgress, removeBackground } from "@/lib/removebg";
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
	const [busy, setBusy] = useState(false);
	const [download, setDownload] = useState<number | null>(null);
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

	const process = async (target: File) => {
		requestId.current += 1;
		const id = requestId.current;
		setBusy(true);
		try {
			const blob = await removeBackground(target, (p: ModelProgress) => {
				if (
					id === requestId.current &&
					p.status === "progress" &&
					p.file?.endsWith(".onnx")
				) {
					setDownload(Math.round(p.progress ?? 0));
				}
				if (id === requestId.current && p.status === "ready") {
					setDownload(null);
				}
			});
			if (id !== requestId.current) return;
			setDownload(null);
			setResultUrl(URL.createObjectURL(blob));
		} catch (e) {
			console.error("[removebg]", e);
			if (id === requestId.current) {
				toast.error(
					"The image could not be processed — try a JPG, PNG or WebP",
				);
			}
		} finally {
			if (id === requestId.current) {
				setBusy(false);
				setDownload(null);
			}
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
		void process(image);
	};

	const reset = () => {
		requestId.current += 1;
		setFile(null);
		setOriginalUrl(null);
		setResultUrl(null);
		setBusy(false);
		setDownload(null);
	};

	const saveResult = () => {
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
				A segmentation model that runs entirely in your browser — the image
				never leaves your device, and there are no limits. The first run
				downloads the model (~40 MB); after that it&#39;s cached.
			</p>

			{!file ? (
				<Dropzone
					className="mt-8"
					onFiles={loadFile}
					label="Drop an image here"
					hint="or click to browse — JPG, PNG or WebP"
					accept="image/*"
					multiple={false}
				/>
			) : (
				<div className="mt-8 flex flex-col gap-5">
					<div className="flex flex-wrap items-center justify-end gap-2">
						<Button variant="outline" onClick={reset}>
							<ArrowCounterClockwiseIcon />
							New image
						</Button>
						<Button onClick={saveResult} disabled={!resultUrl || busy}>
							<DownloadSimpleIcon />
							Download PNG
						</Button>
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
									"mt-2 flex min-h-40 items-center justify-center overflow-hidden rounded-xl border",
									CHECKERBOARD,
								)}
							>
								{busy ? (
									<div className="flex w-full max-w-56 flex-col items-center gap-3 p-6">
										<Spinner className="size-5 text-muted-foreground" />
										{download !== null ? (
											<>
												<Progress value={download} />
												<p className="text-xs text-muted-foreground">
													Downloading model — {download}%
												</p>
											</>
										) : (
											<p className="text-xs text-muted-foreground">
												Processing…
											</p>
										)}
									</div>
								) : resultUrl ? (
									<img
										src={resultUrl}
										alt="Background removed"
										className="mx-auto max-h-[60svh] w-auto max-w-full"
									/>
								) : (
									<p className="p-6 text-sm text-muted-foreground">
										Something went wrong — drop the image again.
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
