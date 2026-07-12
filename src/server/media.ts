import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ProcError, run } from "./proc";

const FFMPEG = process.env.FFMPEG_PATH ?? "ffmpeg";

const EVEN_SCALE = "scale=trunc(iw/2)*2:trunc(ih/2)*2";

function argsFor(dst: string, quality: number): Array<string> {
	const crf = Math.round(18 + ((100 - quality) * 18) / 100);
	const audioKbps =
		quality >= 90
			? "256k"
			: quality >= 70
				? "192k"
				: quality >= 50
					? "128k"
					: "96k";
	switch (dst) {
		case "mp4":
		case "mov":
			return [
				"-vf",
				EVEN_SCALE,
				"-c:v",
				"libx264",
				"-crf",
				String(crf),
				"-preset",
				"veryfast",
				"-pix_fmt",
				"yuv420p",
				"-c:a",
				"aac",
				"-b:a",
				audioKbps,
				"-movflags",
				"+faststart",
			];
		case "mkv":
			return [
				"-vf",
				EVEN_SCALE,
				"-c:v",
				"libx264",
				"-crf",
				String(crf),
				"-preset",
				"veryfast",
				"-pix_fmt",
				"yuv420p",
				"-c:a",
				"aac",
				"-b:a",
				audioKbps,
			];
		case "webm":
			return [
				"-vf",
				EVEN_SCALE,
				"-c:v",
				"libvpx-vp9",
				"-crf",
				String(crf + 8),
				"-b:v",
				"0",
				"-cpu-used",
				"4",
				"-row-mt",
				"1",
				"-c:a",
				"libopus",
				"-b:a",
				audioKbps,
			];
		case "avi":
			return [
				"-c:v",
				"mpeg4",
				"-q:v",
				String(Math.max(2, Math.round(2 + ((100 - quality) * 14) / 100))),
				"-c:a",
				"libmp3lame",
				"-b:a",
				audioKbps,
			];
		case "flv":
			return [
				"-c:v",
				"flv",
				"-q:v",
				"5",
				"-c:a",
				"libmp3lame",
				"-b:a",
				audioKbps,
			];
		case "mpg":
			return [
				"-vf",
				EVEN_SCALE,
				"-c:v",
				"mpeg2video",
				"-q:v",
				"4",
				"-c:a",
				"mp2",
				"-b:a",
				"192k",
			];
		case "3gp":
			return [
				"-vf",
				EVEN_SCALE,
				"-c:v",
				"libx264",
				"-profile:v",
				"baseline",
				"-level",
				"3.0",
				"-c:a",
				"aac",
				"-b:a",
				audioKbps,
			];
		case "ts":
			return [
				"-vf",
				EVEN_SCALE,
				"-c:v",
				"libx264",
				"-crf",
				String(crf),
				"-preset",
				"veryfast",
				"-c:a",
				"aac",
				"-b:a",
				audioKbps,
				"-f",
				"mpegts",
			];
		case "gif": {
			const width = quality >= 80 ? 640 : quality >= 50 ? 480 : 360;
			const fps = quality >= 80 ? 15 : 12;
			return [
				"-filter_complex",
				`fps=${fps},scale=min(iw\\,${width}):-2:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`,
				"-loop",
				"0",
			];
		}
		case "mp3":
			return ["-vn", "-c:a", "libmp3lame", "-b:a", audioKbps];
		case "wav":
			return ["-vn", "-c:a", "pcm_s16le"];
		case "flac":
			return ["-vn", "-c:a", "flac", "-compression_level", "8"];
		case "ogg":
			return ["-vn", "-c:a", "libvorbis", "-b:a", audioKbps];
		case "opus":
			return ["-vn", "-c:a", "libopus", "-b:a", audioKbps];
		case "aac":
		case "m4a":
			return ["-vn", "-c:a", "aac", "-b:a", audioKbps];
		case "aiff":
			return ["-vn", "-c:a", "pcm_s16be"];
		case "wma":
			return ["-vn", "-c:a", "wmav2", "-b:a", audioKbps];
		case "ac3":
			return ["-vn", "-c:a", "ac3", "-b:a", audioKbps];
		case "jpg":
			return [
				"-frames:v",
				"1",
				"-q:v",
				String(Math.max(2, Math.round(2 + ((100 - quality) * 29) / 100))),
			];
		case "png":
		case "bmp":
		case "tiff":
			return ["-frames:v", "1"];
		default:
			throw new Error(`Unsupported media target .${dst}`);
	}
}

export async function convertMedia(
	input: Buffer,
	src: string,
	dst: string,
	quality: number,
): Promise<Buffer> {
	const dir = await mkdtemp(join(tmpdir(), "ultra-"));
	try {
		const inPath = join(dir, `in.${src}`);
		const outPath = join(dir, `out.${dst}`);
		await writeFile(inPath, input);
		try {
			await run(FFMPEG, [
				"-hide_banner",
				"-y",
				"-i",
				inPath,
				...argsFor(dst, quality),
				outPath,
			]);
		} catch (e) {
			const detail =
				e instanceof ProcError
					? e.detail
					: e instanceof Error
						? e.message
						: String(e);
			const audioTarget = [
				"mp3",
				"wav",
				"ogg",
				"opus",
				"flac",
				"aac",
				"m4a",
				"aiff",
				"wma",
				"ac3",
			].includes(dst);
			if (
				audioTarget &&
				/does not contain any stream|Error opening output/i.test(detail)
			) {
				throw new Error("This file has no audio track to extract");
			}
			throw e;
		}
		return await readFile(outPath);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}
