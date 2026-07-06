import { FORMATS } from "@/lib/formats";
import { convertArchive } from "./archive";
import { convertImage } from "./image";
import { convertMedia } from "./media";

export async function convert(
	input: Buffer,
	src: string,
	dst: string,
	quality: number,
): Promise<Buffer> {
	const source = FORMATS[src];
	const target = FORMATS[dst];
	if (!source || !target)
		throw new Error(`Unknown format pair .${src} → .${dst}`);
	if (source.category === "archive") return convertArchive(input, src, dst);
	if (source.category === "image" && target.category === "image") {
		let buffer = input;
		let from = src;
		if (from === "bmp") {
			buffer = await convertMedia(buffer, "bmp", "png", 100);
			from = "png";
		}
		if (dst === "bmp") {
			const png = await convertImage(buffer, from, "png", 100);
			return convertMedia(png, "png", "bmp", quality);
		}
		return convertImage(buffer, from, dst, quality);
	}
	return convertMedia(input, src, dst, quality);
}
