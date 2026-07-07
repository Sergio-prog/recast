import { createReadStream } from "node:fs";
import { mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { contentDisposition } from "./http";
import { ProcError, run } from "./proc";

const YTDLP = process.env.YTDLP_PATH ?? "yt-dlp";

function friendly(e: unknown): Error {
	if (e instanceof ProcError) {
		const line = e.detail.match(/^ERROR:\s*(.+)$/m)?.[1];
		return new Error(
			line ??
				"Download failed — the site may be unsupported or the link invalid",
		);
	}
	return e instanceof Error ? e : new Error(String(e));
}

export type MediaInfo = {
	title: string;
	thumbnail: string | null;
	duration: string | null;
	uploader: string | null;
	source: string | null;
};

export async function fetchInfo(url: string): Promise<MediaInfo> {
	const out = await run(
		YTDLP,
		["-J", "--no-playlist", "--no-warnings", url],
		60_000,
	).catch((e: unknown) => {
		throw friendly(e);
	});
	const info = JSON.parse(out);
	return {
		title: info.title ?? "Untitled",
		thumbnail: info.thumbnail ?? null,
		duration: info.duration_string ?? null,
		uploader: info.uploader ?? info.channel ?? null,
		source: info.extractor_key ?? null,
	};
}

export async function downloadToResponse(
	url: string,
	mode: "video" | "audio",
): Promise<Response> {
	const dir = await mkdtemp(join(tmpdir(), "ultra-dl-"));
	try {
		const modeArgs =
			mode === "audio"
				? ["-x", "--audio-format", "mp3", "--audio-quality", "0"]
				: [
						"-f",
						"bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/b",
						"--merge-output-format",
						"mp4",
					];
		const { maxDownloadMb } = await import("./limits");
		const sizeArgs =
			maxDownloadMb > 0 ? ["--max-filesize", `${maxDownloadMb}M`] : [];
		await run(
			YTDLP,
			[
				...modeArgs,
				...sizeArgs,
				"--no-playlist",
				"--no-warnings",
				"-o",
				join(dir, "%(title).150B.%(ext)s"),
				url,
			],
			900_000,
		);
		const [name] = await readdir(dir);
		if (!name) throw new Error("yt-dlp produced no file");
		const path = join(dir, name);
		const { size } = await stat(path);
		const file = createReadStream(path);
		file.once("close", () => {
			void rm(dir, { recursive: true, force: true });
		});
		return new Response(Readable.toWeb(file) as unknown as ReadableStream, {
			headers: {
				"content-type": mode === "audio" ? "audio/mpeg" : "video/mp4",
				"content-length": String(size),
				"content-disposition": contentDisposition(name),
			},
		});
	} catch (e) {
		await rm(dir, { recursive: true, force: true });
		throw friendly(e);
	}
}
