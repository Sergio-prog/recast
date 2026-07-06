import {
	ArrowRightIcon,
	CameraIcon,
	ClipboardTextIcon,
	CurrencyCircleDollarIcon,
	DownloadSimpleIcon,
	FilePdfIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	CATEGORY_META,
	type Category,
	FORMATS,
	POPULAR_PAIRS,
} from "@/lib/formats";

const CATEGORIES: Array<{ category: Category; page: string | null }> = [
	{ category: "image", page: "/images" },
	{ category: "video", page: "/video" },
	{ category: "audio", page: "/audio" },
	{ category: "archive", page: null },
];

export function ToolDirectory({
	onPick,
}: {
	onPick: (pair: readonly [string, string]) => void;
}) {
	return (
		<section className="mx-auto w-full max-w-5xl px-4 pb-20 pt-16">
			<h2 className="font-display text-2xl font-semibold">All tools</h2>
			<p className="mt-1 text-sm text-muted-foreground">
				Pick a pair to preset the workbench, or drop files and choose a target
				per file.
			</p>
			<div className="mt-6 grid gap-4 sm:grid-cols-2">
				{CATEGORIES.map(({ category, page }) => (
					<Card key={category}>
						<CardHeader>
							<CardTitle className="flex items-baseline justify-between gap-2 font-mono text-sm uppercase tracking-widest">
								{CATEGORY_META[category].label}
								{page && (
									<Link
										to={page}
										className="text-xs normal-case tracking-normal text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
									>
										Dedicated page →
									</Link>
								)}
							</CardTitle>
							<CardDescription>{CATEGORY_META[category].blurb}</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-wrap gap-2">
							{POPULAR_PAIRS.filter(
								([from]) => FORMATS[from]?.category === category,
							).map(([from, to]) => (
								<button
									key={`${from}-${to}`}
									type="button"
									onClick={() => onPick([from, to])}
									className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 font-mono text-xs uppercase transition-colors hover:border-primary hover:text-primary"
								>
									{from}
									<ArrowRightIcon className="size-3" />
									{to}
								</button>
							))}
						</CardContent>
					</Card>
				))}
				<Card className="transition-colors hover:border-primary/50">
					<Link to="/pdf" className="block">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest">
								<FilePdfIcon className="size-4" />
								PDF tools
							</CardTitle>
							<CardDescription>
								Merge PDFs, split by pages or ranges, bundle images into one PDF
								— plus PDF ↔ image on the workbench.
							</CardDescription>
						</CardHeader>
					</Link>
				</Card>
				<Card className="transition-colors hover:border-primary/50">
					<Link to="/screenshot" className="block">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest">
								<CameraIcon className="size-4" />
								Website screenshot
							</CardTitle>
							<CardDescription>
								Capture any page as PNG or JPG — viewport presets, full page,
								dark mode and a delay for animated sites.
							</CardDescription>
						</CardHeader>
					</Link>
				</Card>
				<Card className="transition-colors hover:border-primary/50">
					<Link to="/paste" className="block">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest">
								<ClipboardTextIcon className="size-4" />
								Pastebin
							</CardTitle>
							<CardDescription>
								Link-only or private pastes with tags and expiry. Google sign-in
								required.
							</CardDescription>
						</CardHeader>
					</Link>
				</Card>
				<Card className="transition-colors hover:border-primary/50">
					<Link to="/download" className="block">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest">
								<DownloadSimpleIcon className="size-4" />
								Video & audio downloader
							</CardTitle>
							<CardDescription>
								Save video as MP4 or audio as MP3 from YouTube, SoundCloud and
								1,800+ other sites.
							</CardDescription>
						</CardHeader>
					</Link>
				</Card>
				<Card className="transition-colors hover:border-primary/50">
					<Link to="/currency" className="block">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest">
								<CurrencyCircleDollarIcon className="size-4" />
								Currency converter
							</CardTitle>
							<CardDescription>
								160+ currencies with daily rates. Convert any amount both ways.
							</CardDescription>
						</CardHeader>
					</Link>
				</Card>
			</div>
		</section>
	);
}
