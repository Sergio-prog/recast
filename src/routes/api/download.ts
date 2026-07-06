import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/download")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const { blockedUrl, rateLimit } = await import("@/server/limits");
				const params = new URL(request.url).searchParams;
				const url = params.get("url") ?? "";
				const isFile = params.get("action") === "file";
				const limited =
					rateLimit(
						request,
						isFile ? "download" : "download-info",
						isFile ? 6 : 15,
					) ?? blockedUrl(url);
				if (limited) return limited;
				try {
					if (isFile) {
						const { downloadToResponse } = await import("@/server/download");
						const mode = params.get("mode") === "audio" ? "audio" : "video";
						return await downloadToResponse(url, mode);
					}
					const { fetchInfo } = await import("@/server/download");
					return Response.json(await fetchInfo(url));
				} catch (e) {
					const message = e instanceof Error ? e.message : "Download failed";
					return new Response(message, { status: 500 });
				}
			},
		},
	},
});
