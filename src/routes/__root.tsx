import {
	ArrowRightIcon,
	CameraIcon,
	CaretDownIcon,
	ClipboardTextIcon,
	CurrencyCircleDollarIcon,
	DownloadSimpleIcon,
	EyeIcon,
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
import { TanStackDevtools } from "@tanstack/react-devtools";
import {
	createRootRoute,
	HeadContent,
	Link,
	Scripts,
	useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { ThemeProvider } from "next-themes";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

import appCss from "../styles.css?url";

const SITE_URL = "https://recast.serhiifotex.dev";
const SITE_TITLE = "Recast — every format you need";
const SITE_DESCRIPTION =
	"Self-hosted toolbench: convert and compress any file, PDF tools, media downloader, website screenshots, DNS dig, pastebin and more.";
const OG_IMAGE = `${SITE_URL}/og.png`;

export const Route = createRootRoute({
	head: ({ matches }) => {
		const pathname = matches.at(-1)?.pathname ?? "/";
		const pageUrl = `${SITE_URL}${pathname === "/" ? "" : pathname}`;
		return {
			meta: [
				{ charSet: "utf-8" },
				{ name: "viewport", content: "width=device-width, initial-scale=1" },
				{ title: SITE_TITLE },
				{ name: "description", content: SITE_DESCRIPTION },
				{ property: "og:type", content: "website" },
				{ property: "og:site_name", content: "Recast" },
				{ property: "og:title", content: SITE_TITLE },
				{ property: "og:description", content: SITE_DESCRIPTION },
				{ property: "og:url", content: pageUrl },
				{ property: "og:image", content: OG_IMAGE },
				{ property: "og:image:width", content: "1200" },
				{ property: "og:image:height", content: "630" },
				{
					property: "og:image:alt",
					content: "Recast — every format you need",
				},
				{ name: "twitter:card", content: "summary_large_image" },
				{ name: "twitter:title", content: SITE_TITLE },
				{ name: "twitter:description", content: SITE_DESCRIPTION },
				{ name: "twitter:image", content: OG_IMAGE },
				{
					name: "theme-color",
					media: "(prefers-color-scheme: light)",
					content: "#ffffff",
				},
				{
					name: "theme-color",
					media: "(prefers-color-scheme: dark)",
					content: "#131316",
				},
			],
			links: [
				{ rel: "canonical", href: pageUrl },
				{ rel: "stylesheet", href: appCss },
				{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
				{ rel: "icon", href: "/favicon.ico", sizes: "32x32" },
				{ rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
				{ rel: "manifest", href: "/manifest.json" },
			],
		};
	},
	notFoundComponent: NotFoundPage,
	shellComponent: RootDocument,
});

function NotFoundPage() {
	return (
		<main className="mx-auto flex min-h-[calc(100svh-8.5rem)] w-full max-w-5xl items-center px-4 py-16">
			<div className="grid w-full items-end gap-10 border-y py-12 sm:grid-cols-[1fr_auto] sm:py-16">
				<div>
					<p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
						404 · Unknown format
					</p>
					<h1 className="mt-4 max-w-2xl font-display text-5xl font-semibold leading-[0.95] tracking-tight sm:text-7xl">
						This page didn’t convert.
					</h1>
					<p className="mt-6 max-w-lg text-muted-foreground">
						The address may be outdated or mistyped. Return to the workbench and
						choose the tool you need.
					</p>
				</div>
				<Button
					render={
						<Link to="/">
							Open converter <ArrowRightIcon />
						</Link>
					}
				/>
			</div>
		</main>
	);
}

type NavItem = { to: string; label: string; icon: Icon };

const CONVERT_ITEMS: Array<NavItem> = [
	{ to: "/images", label: "Images", icon: ImageIcon },
	{ to: "/video", label: "Video", icon: FilmStripIcon },
	{ to: "/audio", label: "Audio", icon: WaveformIcon },
	{ to: "/currency", label: "Currency", icon: CurrencyCircleDollarIcon },
];

const NAV_GROUPS: Array<{ label: string; items: Array<NavItem> }> = [
	{
		label: "Files",
		items: [
			{ to: "/pdf", label: "PDF tools", icon: FilePdfIcon },
			{ to: "/viewer", label: "File viewer", icon: EyeIcon },
		],
	},
	{
		label: "Studio",
		items: [
			{ to: "/demotivator", label: "Demotivator", icon: FrameCornersIcon },
			{ to: "/wordart", label: "Word Art", icon: MagicWandIcon },
			{
				to: "/removebg",
				label: "Remove background",
				icon: SelectionBackgroundIcon,
			},
		],
	},
	{
		label: "Web",
		items: [
			{ to: "/screenshot", label: "Screenshot", icon: CameraIcon },
			{ to: "/download", label: "Downloader", icon: DownloadSimpleIcon },
			{ to: "/dig", label: "DNS dig", icon: ListMagnifyingGlassIcon },
			{ to: "/ip", label: "My IP", icon: GlobeIcon },
			{ to: "/speed", label: "Speed test", icon: GaugeIcon },
		],
	},
	{
		label: "Text",
		items: [
			{ to: "/paste", label: "Pastebin", icon: ClipboardTextIcon },
			{ to: "/tokenizer", label: "Tokenizer", icon: TextAaIcon },
			{ to: "/encode", label: "Encode & Hash", icon: HashIcon },
		],
	},
];

function NavMenu({ label, items }: { label: string; items: Array<NavItem> }) {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const active = items.some((item) => pathname.startsWith(item.to));
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				className={cn(
					"flex items-center gap-0.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
					active && "bg-muted text-foreground",
				)}
			>
				{label}
				<CaretDownIcon className="size-3.5" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{items.map((item) => (
					<DropdownMenuItem
						key={item.to}
						render={
							<Link to={item.to}>
								<item.icon className="size-4" />
								{item.label}
							</Link>
						}
					/>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function ConvertMenu() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const active =
		pathname === "/" || CONVERT_ITEMS.some((item) => pathname.startsWith(item.to));
	return (
		<div
			className={cn(
				"flex items-center rounded-md text-muted-foreground",
				active && "bg-muted text-foreground",
			)}
		>
			<Link
				to="/"
				className="rounded-l-md py-1.5 pl-2.5 pr-1 text-sm transition-colors hover:text-foreground"
			>
				Convert
			</Link>
			<DropdownMenu>
				<DropdownMenuTrigger
					aria-label="Converter pages"
					className="rounded-r-md py-2 pl-0.5 pr-1.5 transition-colors hover:text-foreground"
				>
					<CaretDownIcon className="size-3.5" />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start">
					{CONVERT_ITEMS.map((item) => (
						<DropdownMenuItem
							key={item.to}
							render={
								<Link to={item.to}>
									<item.icon className="size-4" />
									{item.label}
								</Link>
							}
						/>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body className="flex min-h-screen flex-col">
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					<header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
						<div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4">
							<Link
								to="/"
								className="flex shrink-0 items-baseline font-mono text-sm font-semibold tracking-tight"
							>
								re
								<ArrowRightIcon
									weight="bold"
									className="size-3 self-center text-muted-foreground"
								/>
								cast
							</Link>
							<div className="flex min-w-0 items-center gap-1">
								<nav className="flex items-center gap-0.5 overflow-x-auto">
									<ConvertMenu />
									{NAV_GROUPS.map((group) => (
										<NavMenu key={group.label} {...group} />
									))}
								</nav>
								<ThemeToggle />
							</div>
						</div>
					</header>
					<div className="flex-1">{children}</div>
					<footer className="border-t py-6">
						<div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4">
							<p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
								recast.serhiifotex.dev
							</p>
							<a
								href="https://github.com/Sergio-prog/recast"
								target="_blank"
								rel="noreferrer"
								className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
							>
								Open source on GitHub
							</a>
						</div>
					</footer>
					<Toaster />
				</ThemeProvider>
				<TanStackDevtools
					config={{ position: "bottom-right" }}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
