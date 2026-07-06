import handler from "./dist/server/server.js";

const clientDir = new URL("./dist/client", import.meta.url).pathname;
const port = Number(process.env.PORT ?? 3000);

Bun.serve({
	port,
	idleTimeout: 240,
	async fetch(request) {
		const { pathname } = new URL(request.url);
		if (pathname !== "/" && !pathname.includes("..")) {
			const file = Bun.file(clientDir + pathname);
			if (await file.exists()) {
				return new Response(file, {
					headers: {
						"cache-control": pathname.startsWith("/assets/")
							? "public, max-age=31536000, immutable"
							: "public, max-age=3600",
					},
				});
			}
		}
		return handler.fetch(request);
	},
});

console.log(`ultra.convert running on http://localhost:${port}`);
