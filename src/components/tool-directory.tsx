import {
	ArrowRightIcon,
	CameraIcon,
	ClipboardTextIcon,
	CurrencyCircleDollarIcon,
	DownloadSimpleIcon,
	EyeIcon,
	FileArchiveIcon,
	FilePdfIcon,
	FilmStripIcon,
	FrameCornersIcon,
	GaugeIcon,
	GlobeIcon,
	HashIcon,
	type Icon,
	ImageIcon,
	ListMagnifyingGlassIcon,
	MagicWandIcon,
	SelectionBackgroundIcon,
	TextAaIcon,
	WaveformIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import {
	CATEGORY_META,
	type Category,
	FORMATS,
	POPULAR_PAIRS,
} from "@/lib/formats";

const CATEGORIES: Array<{
	category: Category;
	page: string | null;
	icon: Icon;
}> = [
	{ category: "image", page: "/images", icon: ImageIcon },
	{ category: "video", page: "/video", icon: FilmStripIcon },
	{ category: "audio", page: "/audio", icon: WaveformIcon },
	{ category: "archive", page: null, icon: FileArchiveIcon },
];

type Tool = {
	to: string;
	label: string;
	blurb: string;
	icon: Icon;
};

const TOOL_GROUPS: Array<{ label: string; blurb: string; tools: Array<Tool> }> =
	[
		{
			label: "Files",
			blurb: "Open, merge and split documents without leaving the browser.",
			tools: [
				{
					to: "/pdf",
					label: "PDF tools",
					blurb:
						"Merge, split by pages or ranges, or bundle images into one PDF.",
					icon: FilePdfIcon,
				},
				{
					to: "/viewer",
					label: "File viewer",
					blurb:
						"Open CSV, Excel and PDF files in the browser — sort, filter, zoom.",
					icon: EyeIcon,
				},
			],
		},
		{
			label: "Studio",
			blurb: "Make things — memes, retro text effects and clean cutouts.",
			tools: [
				{
					to: "/demotivator",
					label: "Demotivator",
					blurb:
						"The classic black-frame meme — editable text layers, nested loops.",
					icon: FrameCornersIcon,
				},
				{
					to: "/wordart",
					label: "Word Art",
					blurb:
						"Six retro text styles plus an animated burning-text GIF generator.",
					icon: MagicWandIcon,
				},
				{
					to: "/removebg",
					label: "Remove background",
					blurb:
						"Color-based cutout to transparent PNG — no AI, heavily rate limited.",
					icon: SelectionBackgroundIcon,
				},
			],
		},
		{
			label: "Web",
			blurb: "Point at a URL, or measure your own connection.",
			tools: [
				{
					to: "/screenshot",
					label: "Screenshot",
					blurb: "Any page as PNG or JPG — full page, dark mode, delay.",
					icon: CameraIcon,
				},
				{
					to: "/download",
					label: "Downloader",
					blurb: "MP4 video or MP3 audio from YouTube and 1,800+ sites.",
					icon: DownloadSimpleIcon,
				},
				{
					to: "/dig",
					label: "DNS dig",
					blurb:
						"Any record type across four resolvers, with a registrar summary.",
					icon: ListMagnifyingGlassIcon,
				},
				{
					to: "/ip",
					label: "IP inspector",
					blurb: "Your address, ISP, location — and what your browser reveals.",
					icon: GlobeIcon,
				},
				{
					to: "/speed",
					label: "Speed test",
					blurb:
						"Ping, download and upload between your browser and this server.",
					icon: GaugeIcon,
				},
			],
		},
		{
			label: "Text",
			blurb: "Paste, count and transform text — all client-side where possible.",
			tools: [
				{
					to: "/paste",
					label: "Pastebin",
					blurb: "Link-only or private pastes with tags and expiry.",
					icon: ClipboardTextIcon,
				},
				{
					to: "/tokenizer",
					label: "Tokenizer",
					blurb: "Count GPT, Claude or Gemini tokens and see every token piece.",
					icon: TextAaIcon,
				},
				{
					to: "/encode",
					label: "Encode & Hash",
					blurb:
						"Base64, URL and hex encode/decode, plus SHA hashing — all in your browser.",
					icon: HashIcon,
				},
			],
		},
	];

const CONVERT_EXTRAS: Array<Tool> = [
	{
		to: "/currency",
		label: "Currency",
		blurb: "160+ currencies with daily rates, converted both ways.",
		icon: CurrencyCircleDollarIcon,
	},
];

export function ToolDirectory({
	onPick,
}: {
	onPick: (pair: readonly [string, string]) => void;
}) {
	return (
		<section className="mx-auto w-full max-w-5xl px-4 pb-20 pt-16">
			<h2 className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
				Convert
			</h2>
			<p className="mt-2 text-sm text-muted-foreground">
				Pick a pair to preset the workbench, or drop files and choose a target
				per file.
			</p>
			<div className="mt-5 grid gap-4 sm:grid-cols-2">
				{CATEGORIES.map(({ category, page, icon: CategoryIcon }) => (
					<div
						key={category}
						className="group rounded-xl border bg-card p-5 transition-colors hover:border-primary/40"
					>
						<div className="flex items-center gap-2.5">
							<CategoryIcon className="size-4.5 text-muted-foreground transition-colors group-hover:text-primary" />
							<h3 className="font-mono text-sm uppercase tracking-widest">
								{CATEGORY_META[category].label}
							</h3>
							{page && (
								<Link
									to={page}
									className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
								>
									Open page
									<ArrowRightIcon className="size-3 transition-transform group-hover:translate-x-0.5" />
								</Link>
							)}
						</div>
						<p className="mt-2 text-sm text-muted-foreground">
							{CATEGORY_META[category].blurb}
						</p>
						<div className="mt-4 flex flex-wrap gap-2">
							{POPULAR_PAIRS.filter(
								([from]) => FORMATS[from]?.category === category,
							).map(([from, to]) => (
								<button
									key={`${from}-${to}`}
									type="button"
									onClick={() => onPick([from, to])}
									className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 font-mono text-xs uppercase transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
								>
									{from}
									<ArrowRightIcon className="size-3" />
									{to}
								</button>
							))}
						</div>
					</div>
				))}
			</div>
			<div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{CONVERT_EXTRAS.map((tool) => (
					<ToolCard key={tool.to} tool={tool} />
				))}
			</div>
			{TOOL_GROUPS.map((group) => (
				<div key={group.label}>
					<h2 className="mt-14 font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
						{group.label}
					</h2>
					<p className="mt-2 text-sm text-muted-foreground">{group.blurb}</p>
					<div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{group.tools.map((tool) => (
							<ToolCard key={tool.to} tool={tool} />
						))}
					</div>
				</div>
			))}
		</section>
	);
}

function ToolCard({ tool }: { tool: Tool }) {
	const ToolIcon = tool.icon;
	return (
		<Link
			to={tool.to}
			className="group rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0"
		>
			<div className="flex items-center gap-2">
				<ToolIcon className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
				<span className="font-mono text-xs uppercase tracking-widest">
					{tool.label}
				</span>
				<ArrowRightIcon className="ml-auto size-3.5 -translate-x-1 text-primary opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
			</div>
			<p className="mt-2 text-xs leading-relaxed text-muted-foreground">
				{tool.blurb}
			</p>
		</Link>
	);
}
