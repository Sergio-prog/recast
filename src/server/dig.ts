import { Resolver } from "node:dns/promises";

export const RECORD_TYPES = [
	"A",
	"AAAA",
	"MX",
	"TXT",
	"NS",
	"CNAME",
	"SOA",
	"CAA",
] as const;

export type RecordType = (typeof RECORD_TYPES)[number];

const RESOLVERS = [
	{ name: "Cloudflare", ip: "1.1.1.1" },
	{ name: "Google", ip: "8.8.8.8" },
	{ name: "Quad9", ip: "9.9.9.9" },
	{ name: "OpenDNS", ip: "208.67.222.222" },
];

export type DigResult = {
	resolver: string;
	ip: string;
	ms: number;
	records: Array<string>;
	error?: string;
};

async function queryType(
	resolver: Resolver,
	domain: string,
	type: RecordType,
): Promise<Array<string>> {
	switch (type) {
		case "A":
			return (await resolver.resolve4(domain, { ttl: true })).map(
				(r) => `${r.address}  ·  TTL ${r.ttl}s`,
			);
		case "AAAA":
			return (await resolver.resolve6(domain, { ttl: true })).map(
				(r) => `${r.address}  ·  TTL ${r.ttl}s`,
			);
		case "MX":
			return (await resolver.resolveMx(domain))
				.sort((a, b) => a.priority - b.priority)
				.map((r) => `${r.priority}  ${r.exchange}`);
		case "TXT":
			return (await resolver.resolveTxt(domain)).map((chunks) =>
				chunks.join(""),
			);
		case "NS":
			return (await resolver.resolveNs(domain)).sort();
		case "CNAME":
			return resolver.resolveCname(domain);
		case "SOA": {
			const soa = await resolver.resolveSoa(domain);
			return [
				`primary ${soa.nsname}`,
				`admin ${soa.hostmaster}`,
				`serial ${soa.serial}`,
				`refresh ${soa.refresh}s · retry ${soa.retry}s · expire ${soa.expire}s · min TTL ${soa.minttl}s`,
			];
		}
		case "CAA":
			return (await resolver.resolveCaa(domain)).map((r) => {
				const value = r.issue ?? r.issuewild ?? r.iodef ?? "";
				const tag = r.issue ? "issue" : r.issuewild ? "issuewild" : "iodef";
				return `${tag} "${value}"${r.critical ? " (critical)" : ""}`;
			});
	}
}

const NO_RECORDS = new Set(["ENODATA", "ENOTFOUND", "NXDOMAIN"]);

export async function dig(
	domain: string,
	type: RecordType,
): Promise<Array<DigResult>> {
	return Promise.all(
		RESOLVERS.map(async ({ name, ip }) => {
			const resolver = new Resolver({ timeout: 4000, tries: 1 });
			resolver.setServers([ip]);
			const started = performance.now();
			try {
				const records = await queryType(resolver, domain, type);
				return {
					resolver: name,
					ip,
					ms: Math.round(performance.now() - started),
					records,
				};
			} catch (e) {
				const code =
					e instanceof Error && "code" in e ? String(e.code) : "EFAIL";
				return {
					resolver: name,
					ip,
					ms: Math.round(performance.now() - started),
					records: [],
					error: NO_RECORDS.has(code)
						? "no records"
						: code === "ETIMEOUT"
							? "timed out"
							: `query failed (${code})`,
				};
			}
		}),
	);
}

export type RdapSummary = {
	registrar: string | null;
	created: string | null;
	expires: string | null;
	updated: string | null;
	status: Array<string>;
	nameservers: Array<string>;
};

const rdapCache = new Map<string, { at: number; body: RdapSummary | null }>();
const RDAP_TTL_MS = 60 * 60 * 1000;

export async function rdap(domain: string): Promise<RdapSummary | null> {
	const hit = rdapCache.get(domain);
	if (hit && Date.now() - hit.at < RDAP_TTL_MS) return hit.body;
	let body: RdapSummary | null = null;
	try {
		const res = await fetch(`https://rdap.org/domain/${domain}`, {
			signal: AbortSignal.timeout(8000),
		});
		if (res.ok) {
			const data = await res.json();
			const events: Array<{ eventAction: string; eventDate: string }> =
				data.events ?? [];
			const eventDate = (action: string) =>
				events.find((e) => e.eventAction === action)?.eventDate ?? null;
			const registrarEntity = (data.entities ?? []).find(
				(e: { roles?: Array<string> }) => e.roles?.includes("registrar"),
			);
			const vcard: Array<[string, unknown, unknown, unknown]> =
				registrarEntity?.vcardArray?.[1] ?? [];
			const fn = vcard.find(([key]) => key === "fn");
			body = {
				registrar: fn ? String(fn[3]) : null,
				created: eventDate("registration"),
				expires: eventDate("expiration"),
				updated: eventDate("last changed"),
				status: data.status ?? [],
				nameservers: (data.nameservers ?? []).map(
					(n: { ldhName?: string }) => n.ldhName?.toLowerCase() ?? "",
				),
			};
		}
	} catch {
		body = null;
	}
	rdapCache.set(domain, { at: Date.now(), body });
	return body;
}
