import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/download")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const params = new URL(request.url).searchParams;
				const url = params.get("url") ?? "";
				if (!/^https?:\/\//i.test(url)) {
					return new Response("Provide a valid http(s) URL", { status: 400 });
				}
				try {
					if (params.get("action") === "file") {
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
