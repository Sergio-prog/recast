import { createFileRoute } from "@tanstack/react-router";

const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

export const Route = createFileRoute("/api/dig")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const { rateLimit } = await import("@/server/limits");
				const limited = rateLimit(request, "dig", 30);
				if (limited) return limited;
				const params = new URL(request.url).searchParams;
				const domain = (params.get("domain") ?? "")
					.trim()
					.toLowerCase()
					.replace(/^https?:\/\//, "")
					.replace(/[/?#].*$/, "")
					.replace(/\.$/, "");
				if (!DOMAIN_RE.test(domain) || domain.length > 253) {
					return new Response("Enter a valid domain, like example.com", {
						status: 400,
					});
				}
				const { RECORD_TYPES, dig, rdap } = await import("@/server/dig");
				const type = RECORD_TYPES.find((t) => t === params.get("type")) ?? "A";
				const withRdap = params.get("rdap") === "1";
				const [records, whois] = await Promise.all([
					dig(domain, type),
					withRdap ? rdap(domain) : Promise.resolve(null),
				]);
				return Response.json({ domain, type, records, whois });
			},
		},
	},
});
