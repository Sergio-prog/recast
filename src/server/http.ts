export function contentDisposition(filename: string): string {
	const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'");
	return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

const PRIVATE_IP =
	/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1$|f[cde])/i;

export function normalizeIp(ip: string): string {
	return ip.trim().replace(/^::ffff:/i, "");
}

export function isPrivateIp(ip: string): boolean {
	return PRIVATE_IP.test(normalizeIp(ip));
}

export function clientIpFrom(request: Request): string | null {
	const socket = request.headers.get("x-client-ip");
	const socketIp = socket ? normalizeIp(socket) : null;
	const trustProxy =
		process.env.TRUST_PROXY === "1" || !socketIp || isPrivateIp(socketIp);
	if (trustProxy) {
		const chain = (request.headers.get("x-forwarded-for") ?? "")
			.split(",")
			.map(normalizeIp)
			.filter(Boolean);
		const publicHop = chain.find((ip) => !isPrivateIp(ip));
		if (publicHop) return publicHop;
		const real = request.headers.get("x-real-ip");
		if (real && !isPrivateIp(real)) return normalizeIp(real);
	}
	return socketIp;
}
