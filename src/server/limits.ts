import { clientIpFrom } from "./http";

const MB = 1024 * 1024;

export const maxUploadBytes = Number(process.env.MAX_UPLOAD_MB ?? 512) * MB;
export const maxPasteBytes = Number(process.env.PASTE_MAX_KB ?? 256) * 1024;
export const maxDownloadMb = Number(process.env.MAX_DOWNLOAD_MB ?? 0);

export function tooLarge(request: Request, maxBytes: number): Response | null {
	const length = Number(request.headers.get("content-length") ?? 0);
	if (length > maxBytes) {
		return new Response(
			`Payload too large — the limit is ${Math.round(maxBytes / MB)} MB`,
			{ status: 413 },
		);
	}
	return null;
}

const buckets = new Map<string, Array<number>>();
const WINDOW_MS = 60_000;

function clientKey(request: Request): string {
	return clientIpFrom(request) ?? "anon";
}

export function rateLimit(
	request: Request,
	name: string,
	limit: number,
): Response | null {
	const key = `${name}:${clientKey(request)}`;
	const now = Date.now();
	const hits = (buckets.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
	if (hits.length >= limit) {
		const retryAfter = Math.ceil((WINDOW_MS - (now - hits[0])) / 1000);
		return new Response("Too many requests — try again in a minute", {
			status: 429,
			headers: { "retry-after": String(retryAfter) },
		});
	}
	hits.push(now);
	buckets.set(key, hits);
	if (buckets.size > 10_000) {
		for (const [k, v] of buckets) {
			if (v.every((t) => now - t >= WINDOW_MS)) buckets.delete(k);
		}
	}
	return null;
}

const PRIVATE_HOST =
	/^(localhost|.*\.local|.*\.internal|127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|\[?f[cde])/i;

export function blockedUrl(raw: string): Response | null {
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		return new Response("Provide a valid http(s) URL", { status: 400 });
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") {
		return new Response("Provide a valid http(s) URL", { status: 400 });
	}
	if (PRIVATE_HOST.test(url.hostname)) {
		return new Response("This host is not allowed", { status: 400 });
	}
	return null;
}
