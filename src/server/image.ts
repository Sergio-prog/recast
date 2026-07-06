import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { run } from "./proc";

export async function convertImage(
	input: Buffer,
	src: string,
	dst: string,
	quality: number,
): Promise<Buffer> {
	let buffer = input;
	let source = src;
	if (src === "heic") {
		buffer = await heicToPng(input);
		source = "png";
	}
	const animated =
		(source === "gif" || source === "webp") &&
		(dst === "gif" || dst === "webp");
	const img = sharp(buffer, {
		animated,
		limitInputPixels: 1_000_000_000,
	}).rotate();
	switch (dst) {
		case "jpg":
			return img
				.flatten({ background: "#ffffff" })
				.jpeg({ quality, mozjpeg: true })
				.toBuffer();
		case "png": {
			if (quality >= 100) return img.png({ compressionLevel: 9 }).toBuffer();
			try {
				return await img
					.png({ palette: true, quality, compressionLevel: 9 })
					.toBuffer();
			} catch {
				return img.png({ compressionLevel: 9 }).toBuffer();
			}
		}
		case "webp":
			return img.webp({ quality, effort: 4 }).toBuffer();
		case "avif":
			return img.avif({ quality: Math.min(quality, 90), effort: 4 }).toBuffer();
		case "gif":
			return img
				.gif({
					colours:
						quality >= 90 ? 256 : quality >= 70 ? 128 : quality >= 50 ? 64 : 32,
				})
				.toBuffer();
		case "tiff":
			return img.tiff({ quality }).toBuffer();
		default:
			throw new Error(`Unsupported image target .${dst}`);
	}
}

async function heicToPng(input: Buffer): Promise<Buffer> {
	try {
		return await sharp(input).png().toBuffer();
	} catch {
		const dir = await mkdtemp(join(tmpdir(), "ultra-"));
		try {
			const inPath = join(dir, "in.heic");
			const outPath = join(dir, "out.png");
			await writeFile(inPath, input);
			await run("sips", ["-s", "format", "png", inPath, "--out", outPath]);
			return await readFile(outPath);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	}
}
