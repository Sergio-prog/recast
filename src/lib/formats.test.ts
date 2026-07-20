import { describe, expect, it } from "vitest";
import {
	defaultTargetFor,
	formatBytes,
	hasQualityKnob,
	normalizeExt,
	replaceExt,
	targetsFor,
} from "@/lib/formats";

describe("normalizeExt", () => {
	it("lowercases and resolves aliases", () => {
		expect(normalizeExt("Photo.JPEG")).toBe("jpg");
	});

	it("resolves multi-extensions", () => {
		expect(normalizeExt("a.tar.gz")).toBe("tar.gz");
	});

	it("resolves the mpeg alias to mpg", () => {
		expect(normalizeExt("clip.mpeg")).toBe("mpg");
	});

	it("resolves the heif alias to heic", () => {
		expect(normalizeExt("x.heif")).toBe("heic");
	});

	it("returns empty string for unknown extensions", () => {
		expect(normalizeExt("file.xyz")).toBe("");
	});

	it("returns empty string when there is no extension", () => {
		expect(normalizeExt("noext")).toBe("");
	});
});

describe("replaceExt", () => {
	it("preserves multi-extension stems", () => {
		expect(replaceExt("a.tar.gz", "zip")).toBe("a.zip");
	});

	it("replaces a single extension regardless of case", () => {
		expect(replaceExt("photo.PNG", "webp")).toBe("photo.webp");
	});
});

describe("targetsFor", () => {
	it("offers gif/webm/pdf for gif source in addition to writable images", () => {
		const targets = targetsFor("gif");
		expect(targets).toContain("mp4");
		expect(targets).toContain("webm");
		expect(targets).toContain("pdf");
	});

	it("offers pdf but not mp4 for png source", () => {
		const targets = targetsFor("png");
		expect(targets).toContain("pdf");
		expect(targets).not.toContain("mp4");
	});

	it("excludes the source archive format but includes other archive formats", () => {
		const targets = targetsFor("zip");
		expect(targets).not.toContain("zip");
		expect(targets).toContain("tar.gz");
	});

	it("offers only png and jpg for pdf source", () => {
		expect(targetsFor("pdf")).toEqual(["png", "jpg"]);
	});

	it("returns an empty array for an unknown extension", () => {
		expect(targetsFor("xyz")).toEqual([]);
	});
});

describe("defaultTargetFor", () => {
	it("maps gif to mp4", () => {
		expect(defaultTargetFor("gif")).toBe("mp4");
	});

	it("maps heic to jpg", () => {
		expect(defaultTargetFor("heic")).toBe("jpg");
	});

	it("returns empty string for an unknown extension", () => {
		expect(defaultTargetFor("xyz")).toBe("");
	});
});

describe("hasQualityKnob", () => {
	it("is true for mp4 and jpg", () => {
		expect(hasQualityKnob("mp4")).toBe(true);
		expect(hasQualityKnob("jpg")).toBe(true);
	});

	it("is false for lossless audio formats", () => {
		expect(hasQualityKnob("wav")).toBe(false);
		expect(hasQualityKnob("flac")).toBe(false);
	});

	it("is false for archive and document targets", () => {
		expect(hasQualityKnob("zip")).toBe(false);
		expect(hasQualityKnob("pdf")).toBe(false);
	});

	it("is false for an unknown target", () => {
		expect(hasQualityKnob("xyz")).toBe(false);
	});
});

describe("formatBytes", () => {
	it("formats zero and sub-KB values in bytes", () => {
		expect(formatBytes(0)).toBe("0 B");
		expect(formatBytes(1023)).toBe("1023 B");
	});

	it("formats KB and MB with one decimal below 100", () => {
		expect(formatBytes(1024)).toBe("1.0 KB");
		expect(formatBytes(1048576)).toBe("1.0 MB");
	});

	it("rounds to a whole number at or above 100 in a unit", () => {
		expect(formatBytes(150000)).toBe("146 KB");
	});
});
