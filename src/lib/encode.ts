export type DecodeResult = { ok: true; value: string } | { ok: false };

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder("utf-8", { fatal: true });

export function base64Encode(text: string): string {
	const bytes = utf8Encoder.encode(text);
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary);
}

export function base64Decode(text: string): DecodeResult {
	try {
		const binary = atob(text);
		const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
		return { ok: true, value: utf8Decoder.decode(bytes) };
	} catch {
		return { ok: false };
	}
}

export function urlEncode(text: string): string {
	return encodeURIComponent(text);
}

export function urlDecode(text: string): DecodeResult {
	try {
		return { ok: true, value: decodeURIComponent(text) };
	} catch {
		return { ok: false };
	}
}

export function hexEncode(text: string): string {
	const bytes = utf8Encoder.encode(text);
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
		"",
	);
}

export function hexDecode(text: string): DecodeResult {
	const normalized = text.trim();
	if (normalized.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(normalized)) {
		return { ok: false };
	}
	try {
		const bytes = new Uint8Array(normalized.length / 2);
		for (let i = 0; i < bytes.length; i++) {
			bytes[i] = Number.parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
		}
		return { ok: true, value: utf8Decoder.decode(bytes) };
	} catch {
		return { ok: false };
	}
}

export function byteLength(text: string): number {
	return utf8Encoder.encode(text).length;
}

export type ShaAlgorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";

export async function sha(algo: ShaAlgorithm, text: string): Promise<string> {
	const bytes = utf8Encoder.encode(text);
	const digest = await crypto.subtle.digest(algo, bytes);
	return Array.from(new Uint8Array(digest), (byte) =>
		byte.toString(16).padStart(2, "0"),
	).join("");
}
