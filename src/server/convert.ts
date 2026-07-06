import { FORMATS, replaceExt } from "@/lib/formats";
import { convertArchive } from "./archive";
import { convertImage } from "./image";
import { convertMedia } from "./media";
import { imageToPdf, pdfToImages } from "./pdf";

export type ConvertResult = {
	data: Buffer;
	mime: string;
	filename: string;
};

export async function convert(
	input: Buffer,
	originalName: string,
	src: string,
	dst: string,
	quality: number,
): Promise<ConvertResult> {
	const source = FORMATS[src];
	const target = FORMATS[dst];
	if (!source || !target) {
		throw new Error(`Unknown format pair .${src} → .${dst}`);
	}
	const named = (data: Buffer): ConvertResult => ({
		data,
		mime: target.mime,
		filename: replaceExt(originalName, dst),
	});
	if (src === "pdf") {
		const stem = originalName.replace(/\.[^./]+$/, "");
		return pdfToImages(input, dst as "png" | "jpg", quality, stem);
	}
	if (dst === "pdf") {
		if (src === "bmp") {
			return named(
				await imageToPdf(await convertMedia(input, "bmp", "png", 100), "png"),
			);
		}
		return named(await imageToPdf(input, src));
	}
	if (source.category === "archive") {
		return named(await convertArchive(input, src, dst));
	}
	if (source.category === "image" && target.category === "image") {
		let buffer = input;
		let from = src;
		if (from === "bmp") {
			buffer = await convertMedia(buffer, "bmp", "png", 100);
			from = "png";
		}
		if (dst === "bmp") {
			const png = await convertImage(buffer, from, "png", 100);
			return named(await convertMedia(png, "png", "bmp", quality));
		}
		return named(await convertImage(buffer, from, dst, quality));
	}
	return named(await convertMedia(input, src, dst, quality));
}
