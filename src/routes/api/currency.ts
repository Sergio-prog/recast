import { createFileRoute } from "@tanstack/react-router";

const TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, { at: number; body: unknown }>();

export const Route = createFileRoute("/api/currency")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const base = (
					new URL(request.url).searchParams.get("base") ?? "USD"
				).toUpperCase();
				if (!/^[A-Z]{3}$/.test(base)) {
					return new Response("Invalid base currency", { status: 400 });
				}
				const hit = cache.get(base);
				if (hit && Date.now() - hit.at < TTL_MS) {
					return Response.json(hit.body);
				}
				const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
				if (!res.ok) {
					return new Response("Rate provider unavailable", { status: 502 });
				}
				const data = await res.json();
				if (data.result !== "success") {
					return new Response("Rate provider error", { status: 502 });
				}
				const body = {
					base,
					updated: data.time_last_update_utc,
					rates: data.rates,
				};
				cache.set(base, { at: Date.now(), body });
				return Response.json(body);
			},
		},
	},
});
