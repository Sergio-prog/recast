import {
	CameraIcon,
	DownloadSimpleIcon,
	MoonIcon,
} from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";

export const Route = createFileRoute("/screenshot")({
	head: () => ({ meta: [{ title: "Website screenshot — ultra.convert" }] }),
	component: ScreenshotPage,
});

const VIEWPORTS = [
	{ value: "1440x900", label: "Desktop · 1440×900" },
	{ value: "1280x800", label: "Laptop · 1280×800" },
	{ value: "768x1024", label: "Tablet · 768×1024" },
	{ value: "390x844", label: "Phone · 390×844" },
];

function ScreenshotPage() {
	const [url, setUrl] = useState("");
	const [delay, setDelay] = useState(0);
	const [viewport, setViewport] = useState("1440x900");
	const [fullPage, setFullPage] = useState(false);
	const [dark, setDark] = useState(false);
	const [retina, setRetina] = useState(false);
	const [format, setFormat] = useState<"png" | "jpg">("png");
	const [working, setWorking] = useState(false);
	const [result, setResult] = useState<{ src: string; name: string } | null>(
		null,
	);

	const capture = async () => {
		if (!/^https?:\/\//i.test(url)) {
			toast.error("Paste a full link, starting with http(s)://");
			return;
		}
		setWorking(true);
		try {
			const [width, height] = viewport.split("x").map(Number);
			const res = await fetch("/api/screenshot", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					url,
					delay,
					width,
					height,
					fullPage,
					dark,
					format,
					scale: retina ? 2 : 1,
				}),
			});
			if (!res.ok) throw new Error(await res.text());
			const blob = await res.blob();
			if (result) URL.revokeObjectURL(result.src);
			const encoded = res.headers
				.get("content-disposition")
				?.match(/filename\*=UTF-8''([^;]+)/)?.[1];
			setResult({
				src: URL.createObjectURL(blob),
				name: encoded ? decodeURIComponent(encoded) : `screenshot.${format}`,
			});
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Screenshot failed");
		} finally {
			setWorking(false);
		}
	};

	return (
		<main className="mx-auto w-full max-w-4xl px-4 pb-20 pt-14">
			<p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
				Website screenshot
			</p>
			<h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
				Pages, framed.
			</h1>
			<p className="mt-4 max-w-xl text-muted-foreground">
				Capture any page as PNG or JPG. Add a delay when the site opens with
				animations or lazy-loads content.
			</p>
			<Card className="mt-8">
				<CardContent className="flex flex-col gap-5">
					<form
						className="flex gap-2"
						onSubmit={(e) => {
							e.preventDefault();
							void capture();
						}}
					>
						<Input
							type="url"
							value={url}
							onChange={(e) => setUrl(e.target.value)}
							placeholder="https://example.com"
							className="h-11 font-mono text-sm"
						/>
						<Button type="submit" size="lg" disabled={working || !url}>
							{working ? <Spinner /> : <CameraIcon />}
							Capture
						</Button>
					</form>
					<div className="flex flex-wrap items-end gap-x-5 gap-y-3">
						<div>
							<Label className="text-xs">Viewport</Label>
							<Select
								value={viewport}
								onValueChange={(v) => setViewport(v as string)}
								items={VIEWPORTS}
							>
								<SelectTrigger size="sm" className="mt-1.5 w-44">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{VIEWPORTS.map((v) => (
										<SelectItem key={v.value} value={v.value}>
											{v.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="w-44">
							<Label className="text-xs">
								Delay{" "}
								<span className="font-mono text-muted-foreground">
									{(delay / 1000).toFixed(1)}s
								</span>
							</Label>
							<Slider
								value={[delay]}
								min={0}
								max={10_000}
								step={500}
								className="mt-3"
								onValueChange={(v) => setDelay(Array.isArray(v) ? v[0] : v)}
							/>
						</div>
						<Toggle
							label="Full page"
							active={fullPage}
							onClick={() => setFullPage(!fullPage)}
						/>
						<Toggle
							label="Dark mode"
							icon={<MoonIcon />}
							active={dark}
							onClick={() => setDark(!dark)}
						/>
						<Toggle
							label="2× retina"
							active={retina}
							onClick={() => setRetina(!retina)}
						/>
						<div className="flex rounded-md border p-0.5">
							{(["png", "jpg"] as const).map((f) => (
								<button
									key={f}
									type="button"
									onClick={() => setFormat(f)}
									className={`rounded px-3 py-1 font-mono text-xs uppercase transition-colors ${
										format === f
											? "bg-primary text-primary-foreground"
											: "text-muted-foreground hover:text-foreground"
									}`}
								>
									{f}
								</button>
							))}
						</div>
					</div>
				</CardContent>
			</Card>
			{result && (
				<div className="mt-6">
					<div className="flex items-center justify-between">
						<p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
							{result.name}
						</p>
						<Button
							size="sm"
							variant="outline"
							render={
								<a href={result.src} download={result.name}>
									<DownloadSimpleIcon />
									Save
								</a>
							}
						/>
					</div>
					<img
						src={result.src}
						alt={`Screenshot of ${url}`}
						className="mt-3 w-full rounded-lg border shadow-sm"
					/>
				</div>
			)}
		</main>
	);
}

function Toggle({
	label,
	active,
	onClick,
	icon,
}: {
	label: string;
	active: boolean;
	onClick: () => void;
	icon?: React.ReactNode;
}) {
	return (
		<button
			type="button"
			aria-pressed={active}
			onClick={onClick}
			className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
				active
					? "border-primary bg-primary text-primary-foreground"
					: "text-muted-foreground hover:text-foreground"
			}`}
		>
			{icon}
			{label}
		</button>
	);
}
