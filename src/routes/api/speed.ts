import { randomBytes } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";

const CHUNK = randomBytes(65536);
const MAX_BYTES = 128 * 1024 * 1024;

export const Route = createFileRoute("/api/speed")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const params = new URL(request.url).searchParams;
				if (params.get("op") === "ping") {
					return new Response(null, {
						status: 204,
						headers: { "cache-control": "no-store" },
					});
				}
				const { rateLimit } = await import("@/server/limits");
				const limited = rateLimit(request, "speed", 60);
				if (limited) return limited;
				const bytes = Math.min(
					MAX_BYTES,
					Math.max(1, Number(params.get("bytes")) || 16 * 1024 * 1024),
				);
				let sent = 0;
				const stream = new ReadableStream({
					pull(controller) {
						if (sent >= bytes) {
							controller.close();
							return;
						}
						const take = Math.min(CHUNK.length, bytes - sent);
						controller.enqueue(CHUNK.subarray(0, take));
						sent += take;
					},
				});
				return new Response(stream, {
					headers: {
						"content-type": "application/octet-stream",
						"content-length": String(bytes),
						"cache-control": "no-store",
					},
				});
			},
			POST: async ({ request }) => {
				const { rateLimit } = await import("@/server/limits");
				const limited = rateLimit(request, "speed", 60);
				if (limited) return limited;
				let received = 0;
				if (request.body) {
					const reader = request.body.getReader();
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;
						received += value.byteLength;
						if (received > MAX_BYTES) {
							await reader.cancel();
							return new Response("Payload too large", { status: 413 });
						}
					}
				}
				return Response.json({ bytes: received });
			},
		},
	},
});
