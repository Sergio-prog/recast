import { TanStackDevtools } from "@tanstack/react-devtools";
import {
	createRootRoute,
	HeadContent,
	Link,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { ThemeProvider } from "next-themes";
import { ThemeToggle } from "@/components/theme-toggle";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "ultra.convert — every format you need" },
			{
				name: "description",
				content:
					"Convert and compress images, video, audio, GIFs and archives. Download from YouTube and SoundCloud. Convert currencies.",
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
	{ to: "/download", label: "Download" },
	{ to: "/currency", label: "Currency" },
] as const;

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
						<div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
							<Link
								to="/"
								className="font-mono text-sm font-semibold tracking-tight"
							>
								ultra<span className="text-muted-foreground">.convert</span>
							</Link>
							<div className="flex items-center gap-2">
								<nav className="flex items-center gap-1">
									{NAV.map((item) => (
										<Link
											key={item.to}
											to={item.to}
											activeOptions={{ exact: item.to === "/" }}
											className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
											activeProps={{ className: "bg-muted text-foreground" }}
										>
											{item.label}
										</Link>
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
								sharp · ffmpeg · yt-dlp · bsdtar
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
