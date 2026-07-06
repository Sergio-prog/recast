export type Category = "image" | "video" | "audio" | "archive";

export type FormatDef = {
	ext: string;
	label: string;
	category: Category;
	mime: string;
	write: boolean;
};

const def = (
	ext: string,
	label: string,
	category: Category,
	mime: string,
	write = true,
): FormatDef => ({ ext, label, category, mime, write });

export const FORMATS: Record<string, FormatDef> = {
	jpg: def("jpg", "JPEG", "image", "image/jpeg"),
	png: def("png", "PNG", "image", "image/png"),
	webp: def("webp", "WebP", "image", "image/webp"),
	avif: def("avif", "AVIF", "image", "image/avif"),
	gif: def("gif", "GIF", "image", "image/gif"),
	tiff: def("tiff", "TIFF", "image", "image/tiff"),
	bmp: def("bmp", "BMP", "image", "image/bmp"),
	heic: def("heic", "HEIC", "image", "image/heic", false),
	svg: def("svg", "SVG", "image", "image/svg+xml", false),
	mp4: def("mp4", "MP4", "video", "video/mp4"),
	webm: def("webm", "WebM", "video", "video/webm"),
	mov: def("mov", "MOV", "video", "video/quicktime"),
	mkv: def("mkv", "MKV", "video", "video/x-matroska"),
	avi: def("avi", "AVI", "video", "video/x-msvideo"),
	mp3: def("mp3", "MP3", "audio", "audio/mpeg"),
	wav: def("wav", "WAV", "audio", "audio/wav"),
	ogg: def("ogg", "OGG", "audio", "audio/ogg"),
	opus: def("opus", "Opus", "audio", "audio/opus"),
	flac: def("flac", "FLAC", "audio", "audio/flac"),
	aac: def("aac", "AAC", "audio", "audio/aac"),
	m4a: def("m4a", "M4A", "audio", "audio/mp4"),
	zip: def("zip", "ZIP", "archive", "application/zip"),
	tar: def("tar", "TAR", "archive", "application/x-tar"),
	"tar.gz": def("tar.gz", "TAR.GZ", "archive", "application/gzip"),
	"tar.bz2": def("tar.bz2", "TAR.BZ2", "archive", "application/x-bzip2"),
	"tar.xz": def("tar.xz", "TAR.XZ", "archive", "application/x-xz"),
	"7z": def("7z", "7Z", "archive", "application/x-7z-compressed"),
};

const ALIASES: Record<string, string> = {
	jpeg: "jpg",
	jfif: "jpg",
	tif: "tiff",
	heif: "heic",
	tgz: "tar.gz",
	tbz2: "tar.bz2",
	txz: "tar.xz",
	m4v: "mp4",
	oga: "ogg",
};

const MULTI_EXTS = ["tar.gz", "tar.bz2", "tar.xz"] as const;

export function normalizeExt(filename: string): string {
	const lower = filename.toLowerCase();
	for (const multi of MULTI_EXTS) {
		if (lower.endsWith(`.${multi}`)) return multi;
	}
	const ext = lower.split(".").pop() ?? "";
	const resolved = ALIASES[ext] ?? ext;
	return FORMATS[resolved] ? resolved : "";
}

export function replaceExt(filename: string, target: string): string {
	const lower = filename.toLowerCase();
	for (const multi of MULTI_EXTS) {
		if (lower.endsWith(`.${multi}`)) {
			return `${filename.slice(0, -(multi.length + 1))}.${target}`;
		}
	}
	return `${filename.replace(/\.[^./]+$/, "")}.${target}`;
}

const writable = (category: Category) =>
	Object.values(FORMATS)
		.filter((f) => f.category === category && f.write)
		.map((f) => f.ext);

export function targetsFor(src: string): Array<string> {
	const format = FORMATS[src];
	if (!format) return [];
	switch (format.category) {
		case "image":
			return src === "gif"
				? [...writable("image"), "mp4", "webm"]
				: writable("image");
		case "video":
			return [...writable("video"), "gif", ...writable("audio")];
		case "audio":
			return writable("audio");
		case "archive":
			return writable("archive").filter((ext) => ext !== src);
	}
}

const DEFAULT_TARGET: Record<string, string> = {
	jpg: "png",
	png: "webp",
	webp: "png",
	avif: "png",
	gif: "mp4",
	tiff: "png",
	bmp: "png",
	heic: "jpg",
	svg: "png",
	mp4: "webm",
	webm: "mp4",
	mov: "mp4",
	mkv: "mp4",
	avi: "mp4",
	mp3: "m4a",
	wav: "mp3",
	ogg: "mp3",
	opus: "mp3",
	flac: "mp3",
	aac: "mp3",
	m4a: "mp3",
	zip: "tar.gz",
	tar: "zip",
	"tar.gz": "zip",
	"tar.bz2": "zip",
	"tar.xz": "zip",
	"7z": "zip",
};

export function defaultTargetFor(src: string): string {
	return DEFAULT_TARGET[src] ?? targetsFor(src)[0] ?? "";
}

const LOSSLESS = new Set(["wav", "flac"]);

export function hasQualityKnob(target: string): boolean {
	const format = FORMATS[target];
	if (!format) return false;
	return format.category !== "archive" && !LOSSLESS.has(target);
}

export const POPULAR_PAIRS: ReadonlyArray<readonly [string, string]> = [
	["jpg", "png"],
	["png", "jpg"],
	["heic", "jpg"],
	["webp", "png"],
	["png", "webp"],
	["svg", "png"],
	["png", "avif"],
	["jpg", "webp"],
	["mov", "mp4"],
	["mkv", "mp4"],
	["mp4", "webm"],
	["avi", "mp4"],
	["mp4", "gif"],
	["gif", "mp4"],
	["mp4", "mp3"],
	["wav", "mp3"],
	["flac", "mp3"],
	["m4a", "mp3"],
	["ogg", "mp3"],
	["zip", "tar.gz"],
	["tar.gz", "zip"],
	["7z", "zip"],
];

export const CATEGORY_META: Record<Category, { label: string; blurb: string }> =
	{
		image: {
			label: "Images",
			blurb: "JPG, PNG, WebP, AVIF, GIF, TIFF, BMP — plus HEIC and SVG input",
		},
		video: {
			label: "Video",
			blurb:
				"MP4, WebM, MOV, MKV, AVI — plus video to GIF and audio extraction",
		},
		audio: {
			label: "Audio",
			blurb: "MP3, WAV, OGG, Opus, FLAC, AAC, M4A",
		},
		archive: {
			label: "Archives",
			blurb: "ZIP, TAR, TAR.GZ, TAR.BZ2, TAR.XZ, 7Z",
		},
	};

export function formatBytes(n: number): string {
	if (n < 1024) return `${n} B`;
	const units = ["KB", "MB", "GB"];
	let value = n / 1024;
	let i = 0;
	while (value >= 1024 && i < units.length - 1) {
		value /= 1024;
		i++;
	}
	return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}
