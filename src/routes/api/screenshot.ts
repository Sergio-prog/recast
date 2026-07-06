import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/screenshot")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { blockedUrl, rateLimit } = await import("@/server/limits");
				let body: Record<string, unknown>;
				try {
					body = await request.json();
				} catch {
					return new Response("Invalid JSON body", { status: 400 });
				}
				const url = typeof body.url === "string" ? body.url : "";
				const limited = rateLimit(request, "screenshot", 6) ?? blockedUrl(url);
				if (limited) return limited;
				const clamp = (
					value: unknown,
					min: number,
					max: number,
					dflt: number,
				) => {
					const n = Number(value);
					return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt;
				};
				try {
					const { captureScreenshot } = await import("@/server/screenshot");
					const format = body.format === "jpg" ? "jpg" : "png";
					const data = await captureScreenshot({
						url,
						delayMs: clamp(body.delay, 0, 10_000, 0),
						width: clamp(body.width, 320, 1920, 1440),
						height: clamp(body.height, 320, 1440, 900),
						fullPage: body.fullPage === true,
						dark: body.dark === true,
						format,
						scale: body.scale === 2 ? 2 : 1,
					});
					const { contentDisposition } = await import("@/server/http");
					const host = new URL(url).hostname.replace(/^www\./, "");
					return new Response(new Uint8Array(data), {
						headers: {
							"content-type": format === "jpg" ? "image/jpeg" : "image/png",
							"content-disposition": contentDisposition(`${host}.${format}`),
						},
					});
				} catch (e) {
					const message = e instanceof Error ? e.message : "Screenshot failed";
					return new Response(message, { status: 500 });
				}
			},
		},
	},
});
