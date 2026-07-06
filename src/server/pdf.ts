import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { createZip } from "./archive";
import { convertImage } from "./image";
import { convertMedia } from "./media";

const require = createRequire(import.meta.url);

function pdfjsOptions(data: Buffer) {
	let standardFontDataUrl: string | undefined;
	try {
		standardFontDataUrl = `${join(
			dirname(require.resolve("pdfjs-dist/package.json")),
			"standard_fonts",
		)}/`;
	} catch {
		standardFontDataUrl = undefined;
	}
	return {
		data: new Uint8Array(data),
		useSystemFonts: true,
		standardFontDataUrl,
	};
}

export async function pdfToImages(
	input: Buffer,
	target: "png" | "jpg",
	quality: number,
	stem: string,
): Promise<{ data: Buffer; mime: string; filename: string }> {
	const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
	const { createCanvas } = await import("@napi-rs/canvas");
	const doc = await getDocument(pdfjsOptions(input)).promise;
	const scale = quality >= 90 ? 200 / 72 : quality >= 60 ? 150 / 72 : 100 / 72;
	const pages: Array<{ name: string; data: Buffer }> = [];
	for (let i = 1; i <= doc.numPages; i++) {
		const page = await doc.getPage(i);
		const viewport = page.getViewport({ scale });
		const canvas = createCanvas(
			Math.ceil(viewport.width),
			Math.ceil(viewport.height),
		);
		const context = canvas.getContext("2d");
		context.fillStyle = "#ffffff";
		context.fillRect(0, 0, canvas.width, canvas.height);
		await page.render({
			canvasContext: context as unknown as CanvasRenderingContext2D,
			canvas: canvas as unknown as HTMLCanvasElement,
			viewport,
		}).promise;
		const data =
			target === "jpg"
				? canvas.toBuffer("image/jpeg", quality / 100)
				: canvas.toBuffer("image/png");
		pages.push({
			name: `${stem}-${String(i).padStart(2, "0")}.${target}`,
			data,
		});
	}
	await doc.cleanup();
	if (pages.length === 1) {
		return {
			data: pages[0].data,
			mime: target === "jpg" ? "image/jpeg" : "image/png",
			filename: `${stem}.${target}`,
		};
	}
	return {
		data: await createZip(pages),
		mime: "application/zip",
		filename: `${stem}-pages.zip`,
	};
}

export async function imageToPdf(input: Buffer, src: string): Promise<Buffer> {
	const pdf = await PDFDocument.create();
	await addImagePage(pdf, input, src);
	return Buffer.from(await pdf.save());
}

export async function imagesToPdf(
	files: Array<{ data: Buffer; ext: string }>,
): Promise<Buffer> {
	const pdf = await PDFDocument.create();
	for (const file of files) {
		await addImagePage(pdf, file.data, file.ext);
	}
	return Buffer.from(await pdf.save());
}

async function addImagePage(pdf: PDFDocument, data: Buffer, ext: string) {
	let bytes = data;
	let kind = ext;
	if (ext === "bmp") {
		bytes = await convertMedia(data, "bmp", "png", 100);
		kind = "png";
	} else if (ext !== "jpg" && ext !== "png") {
		bytes = await convertImage(data, ext, "png", 100);
		kind = "png";
	}
	const image =
		kind === "jpg" ? await pdf.embedJpg(bytes) : await pdf.embedPng(bytes);
	const page = pdf.addPage([image.width, image.height]);
	page.drawImage(image, {
		x: 0,
		y: 0,
		width: image.width,
		height: image.height,
	});
}

export async function mergePdfs(files: Array<Buffer>): Promise<Buffer> {
	const merged = await PDFDocument.create();
	for (const file of files) {
		const doc = await PDFDocument.load(new Uint8Array(file));
		const pages = await merged.copyPages(doc, doc.getPageIndices());
		for (const page of pages) merged.addPage(page);
	}
	return Buffer.from(await merged.save());
}

export function parseRanges(spec: string, pageCount: number): Array<number> {
	const indices = new Set<number>();
	for (const part of spec.split(",")) {
		const trimmed = part.trim();
		if (!trimmed) continue;
		const match = trimmed.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
		if (!match) throw new Error(`Invalid page range: "${trimmed}"`);
		const start = Number(match[1]);
		const end = Number(match[2] ?? match[1]);
		for (let i = start; i <= end; i++) {
			if (i >= 1 && i <= pageCount) indices.add(i - 1);
		}
	}
	if (indices.size === 0) throw new Error("No valid pages in range");
	return [...indices].sort((a, b) => a - b);
}

export async function splitPdf(
	input: Buffer,
	range: string | null,
	stem: string,
): Promise<{ data: Buffer; mime: string; filename: string }> {
	const doc = await PDFDocument.load(new Uint8Array(input));
	if (range) {
		const indices = parseRanges(range, doc.getPageCount());
		const out = await PDFDocument.create();
		const pages = await out.copyPages(doc, indices);
		for (const page of pages) out.addPage(page);
		return {
			data: Buffer.from(await out.save()),
			mime: "application/pdf",
			filename: `${stem}-pages-${range.replace(/[^\d,-]/g, "")}.pdf`,
		};
	}
	const entries: Array<{ name: string; data: Buffer }> = [];
	for (const index of doc.getPageIndices()) {
		const out = await PDFDocument.create();
		const [page] = await out.copyPages(doc, [index]);
		out.addPage(page);
		entries.push({
			name: `${stem}-${String(index + 1).padStart(2, "0")}.pdf`,
			data: Buffer.from(await out.save()),
		});
	}
	return {
		data: await createZip(entries),
		mime: "application/zip",
		filename: `${stem}-split.zip`,
	};
}
