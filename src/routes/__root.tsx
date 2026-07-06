import {
	ArrowRightIcon,
	CameraIcon,
	CaretDownIcon,
	GaugeIcon,
	GlobeIcon,
	MagnifyingGlassIcon,
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "Recast — every format you need" },
			{
				name: "description",
				content:
					"Self-hosted toolbench: convert and compress any file, PDF tools, media downloader, website screenshots, DNS dig, pastebin and more.",
			},
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
			{ rel: "stylesheet", href: appCss },
			{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
			{ rel: "icon", href: "/favicon.ico", sizes: "32x32" },
			{ rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
			{ rel: "manifest", href: "/manifest.json" },
		],
	}),
	shellComponent: RootDocument,
});

const NAV = [
	{ to: "/", label: "Convert" },
	{ to: "/images", label: "Images" },
	{ to: "/video", label: "Video" },
	{ to: "/audio", label: "Audio" },
	{ to: "/pdf", label: "PDF" },
	{ to: "/paste", label: "Paste" },
] as const;

const NETWORK = [
	{ to: "/screenshot", label: "Screenshot", icon: CameraIcon },
	{ to: "/dig", label: "DNS dig", icon: MagnifyingGlassIcon },
	{ to: "/ip", label: "My IP", icon: GlobeIcon },
	{ to: "/speed", label: "Speed test", icon: GaugeIcon },
] as const;

const TAIL_NAV = [
	{ to: "/download", label: "Download" },
	{ to: "/currency", label: "Currency" },
] as const;

function NavLink({ to, label }: { to: string; label: string }) {
	return (
		<Link
			to={to}
			activeOptions={{ exact: to === "/" }}
			className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
			activeProps={{ className: "bg-muted text-foreground" }}
		>
			{label}
		</Link>
	);
}

function NetworkMenu() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const active = NETWORK.some((item) => pathname.startsWith(item.to));
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				className={cn(
					"flex items-center gap-0.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
					active && "bg-muted text-foreground",
				)}
			>
				Network
				<CaretDownIcon className="size-3.5" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{NETWORK.map((item) => (
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
									{NAV.map((item) => (
										<NavLink key={item.to} {...item} />
									))}
									<NetworkMenu />
									{TAIL_NAV.map((item) => (
										<NavLink key={item.to} {...item} />
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
							<p className="text-xs text-muted-foreground">
								Files are processed on this machine — nothing is uploaded to a
								third party.
							</p>
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
