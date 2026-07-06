import { createFileRoute } from "@tanstack/react-router";

type Geo = {
	ip: string;
	country: string | null;
	city: string | null;
	region: string | null;
	isp: string | null;
	org: string | null;
	asn: number | null;
	timezone: string | null;
	flag: string | null;
};

const geoCache = new Map<string, { at: number; body: Geo | null }>();
const GEO_TTL_MS = 60 * 60 * 1000;

const PRIVATE_IP =
	/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1$|f[cde])/i;

async function lookup(ip: string | null): Promise<Geo | null> {
	const key = ip ?? "self";
	const hit = geoCache.get(key);
	if (hit && Date.now() - hit.at < GEO_TTL_MS) return hit.body;
	let body: Geo | null = null;
	try {
		const res = await fetch(`https://ipwho.is/${ip ?? ""}`, {
			signal: AbortSignal.timeout(8000),
		});
		const data = await res.json();
		if (data.success !== false) {
			body = {
				ip: data.ip,
				country: data.country ?? null,
				city: data.city ?? null,
				region: data.region ?? null,
				isp: data.connection?.isp ?? null,
				org: data.connection?.org ?? null,
				asn: data.connection?.asn ?? null,
				timezone: data.timezone?.id ?? null,
				flag: data.flag?.emoji ?? null,
			};
		}
	} catch {
		body = null;
	}
	geoCache.set(key, { at: Date.now(), body });
	return body;
}

export const Route = createFileRoute("/api/ip")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const { rateLimit } = await import("@/server/limits");
				const limited = rateLimit(request, "ip", 30);
				if (limited) return limited;
				const forwarded = request.headers.get("x-forwarded-for");
				const clientIp =
					(process.env.TRUST_PROXY === "1" && forwarded
						? forwarded.split(",")[0].trim()
						: null) ?? request.headers.get("x-client-ip");
				const isPublic = Boolean(clientIp) && !PRIVATE_IP.test(clientIp ?? "");
				const geo = await lookup(isPublic ? clientIp : null);
				let reverse: Array<string> = [];
				const ipForReverse = isPublic ? clientIp : (geo?.ip ?? null);
				if (ipForReverse) {
					try {
						const { reverse: dnsReverse } = await import("node:dns/promises");
						reverse = await dnsReverse(ipForReverse);
					} catch {
						reverse = [];
					}
				}
				return Response.json({
					ip: isPublic ? clientIp : (geo?.ip ?? clientIp ?? "unknown"),
					viaServer: !isPublic,
					reverse,
					geo,
				});
			},
		},
	},
});
