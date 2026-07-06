import { DownloadSimpleIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export const Route = createFileRoute("/download")({
	head: () => ({ meta: [{ title: "Download video & audio — ultra.convert" }] }),
	component: DownloadPage,
});

type MediaInfo = {
	title: string;
	thumbnail: string | null;
	duration: string | null;
	uploader: string | null;
	source: string | null;
};

function DownloadPage() {
	const [url, setUrl] = useState("");
	const [mode, setMode] = useState<"video" | "audio">("video");
	const [info, setInfo] = useState<MediaInfo | null>(null);
	const [fetching, setFetching] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const lookup = async () => {
		if (!/^https?:\/\//i.test(url)) {
			setError("Paste a full link, starting with http(s)://");
			return;
		}
		setFetching(true);
		setError(null);
		setInfo(null);
		try {
			const res = await fetch(`/api/download?url=${encodeURIComponent(url)}`);
			if (!res.ok) throw new Error(await res.text());
			setInfo(await res.json());
		} catch (e) {
			setError(e instanceof Error ? e.message : "Could not read that link");
		} finally {
			setFetching(false);
		}
	};

	return (
		<main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-14">
			<p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
				Media downloader
			</p>
			<h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
				Save video & audio.
			</h1>
			<p className="mt-4 max-w-xl text-muted-foreground">
				Paste a link from YouTube, SoundCloud or 1,800+ other sites. Get the
				video as MP4 or just the audio as MP3.
			</p>
			<form
				className="mt-8 flex gap-2"
				onSubmit={(e) => {
					e.preventDefault();
					void lookup();
				}}
			>
				<Input
					type="url"
					value={url}
					onChange={(e) => setUrl(e.target.value)}
					placeholder="https://www.youtube.com/watch?v=…"
					className="h-11 font-mono text-sm"
				/>
				<Button type="submit" size="lg" disabled={fetching || !url}>
					{fetching ? <Spinner /> : <MagnifyingGlassIcon />}
					Look up
				</Button>
			</form>
			{error && <p className="mt-3 text-sm text-destructive">{error}</p>}
			{info && (
				<Card className="mt-6 py-0">
					<CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
						{info.thumbnail && (
							<img
								src={info.thumbnail}
								alt=""
								className="aspect-video w-full rounded-lg object-cover sm:w-56"
							/>
						)}
						<div className="flex min-w-0 flex-1 flex-col gap-2">
							<div className="flex items-start justify-between gap-2">
								<h2 className="font-medium leading-snug">{info.title}</h2>
								{info.source && (
									<Badge
										variant="secondary"
										className="shrink-0 font-mono text-xs"
									>
										{info.source}
									</Badge>
								)}
							</div>
							<p className="font-mono text-xs text-muted-foreground">
								{[info.uploader, info.duration].filter(Boolean).join(" · ")}
							</p>
							<div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
								<div className="flex rounded-md border p-0.5">
									{(["video", "audio"] as const).map((m) => (
										<button
											key={m}
											type="button"
											onClick={() => setMode(m)}
											className={`rounded px-3 py-1 font-mono text-xs uppercase transition-colors ${
												mode === m
													? "bg-primary text-primary-foreground"
													: "text-muted-foreground hover:text-foreground"
											}`}
										>
											{m === "video" ? "MP4 video" : "MP3 audio"}
										</button>
									))}
								</div>
								<Button
									render={
										<a
											href={`/api/download?action=file&mode=${mode}&url=${encodeURIComponent(url)}`}
											download
										>
											<DownloadSimpleIcon />
											Download {mode === "video" ? "MP4" : "MP3"}
										</a>
									}
								/>
							</div>
							<p className="text-xs text-muted-foreground">
								Large files take a while — the download starts once the file is
								ready.
							</p>
						</div>
					</CardContent>
				</Card>
			)}
		</main>
	);
}
