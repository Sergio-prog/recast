import {
	ArrowRightIcon,
	CurrencyCircleDollarIcon,
	DownloadSimpleIcon,
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

const CATEGORIES: Array<Category> = ["image", "video", "audio", "archive"];

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
				{CATEGORIES.map((category) => (
					<Card key={category}>
						<CardHeader>
							<CardTitle className="font-mono text-sm uppercase tracking-widest">
								{CATEGORY_META[category].label}
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
