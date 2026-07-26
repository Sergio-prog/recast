import { describe, expect, it } from "vitest";
import {
	base64Decode,
	base64Encode,
	hexDecode,
	hexEncode,
	sha,
	urlDecode,
	urlEncode,
} from "@/lib/encode";

describe("base64Encode / base64Decode", () => {
	it("round-trips ASCII", () => {
		const encoded = base64Encode("hello world");
		expect(base64Decode(encoded)).toEqual({ ok: true, value: "hello world" });
	});

	it("round-trips non-ASCII text", () => {
		const text = "café 🚀";
		const encoded = base64Encode(text);
		expect(base64Decode(encoded)).toEqual({ ok: true, value: text });
	});

	it("returns ok:false for malformed input", () => {
		expect(base64Decode("not base64!!!").ok).toBe(false);
	});
});

describe("urlEncode / urlDecode", () => {
	it("round-trips a query-like string", () => {
		const text = "a=b&c=d café";
		const encoded = urlEncode(text);
		expect(urlDecode(encoded)).toEqual({ ok: true, value: text });
	});

	it("returns ok:false for malformed percent-encoding", () => {
		expect(urlDecode("%").ok).toBe(false);
	});
});

describe("hexEncode / hexDecode", () => {
	it("round-trips ASCII", () => {
		const encoded = hexEncode("hello");
		expect(hexDecode(encoded)).toEqual({ ok: true, value: "hello" });
	});

	it("round-trips non-ASCII text", () => {
		const text = "café 🚀";
		const encoded = hexEncode(text);
		expect(hexDecode(encoded)).toEqual({ ok: true, value: text });
	});

	it("returns ok:false for odd-length input", () => {
		expect(hexDecode("abc").ok).toBe(false);
	});

	it("returns ok:false for non-hex characters", () => {
		expect(hexDecode("zz").ok).toBe(false);
	});
});

describe("sha", () => {
	it("matches the known SHA-256 vector for 'abc'", async () => {
		expect(await sha("SHA-256", "abc")).toBe(
			"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
		);
	});
});
