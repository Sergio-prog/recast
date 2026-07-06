import { createFileRoute } from "@tanstack/react-router";
import { normalizeExt } from "@/lib/formats";

export const Route = createFileRoute("/api/pdf")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { maxUploadBytes, rateLimit, tooLarge } = await import(
					"@/server/limits"
				);
				const limited =
					rateLimit(request, "pdf", 15) ?? tooLarge(request, maxUploadBytes);
				if (limited) return limited;
				const form = await request.formData();
				const op = String(form.get("op") ?? "");
				const files = form
					.getAll("file")
					.filter((f): f is File => f instanceof File);
				if (files.length === 0) {
					return new Response("No files uploaded", { status: 400 });
				}
				const { contentDisposition } = await import("@/server/http");
				const pdf = await import("@/server/pdf");
				const stem = files[0].name.replace(/\.[^./]+$/, "");
				try {
					if (op === "merge") {
						if (files.some((f) => normalizeExt(f.name) !== "pdf")) {
							return new Response("Merge accepts PDF files only", {
								status: 415,
							});
						}
						const buffers = await Promise.all(
							files.map(async (f) => Buffer.from(await f.arrayBuffer())),
						);
						const data = await pdf.mergePdfs(buffers);
						return pdfResponse(data, `${stem}-merged.pdf`, contentDisposition);
					}
					if (op === "split") {
						if (normalizeExt(files[0].name) !== "pdf") {
							return new Response("Split accepts a PDF file", { status: 415 });
						}
						const range = form.get("range") ? String(form.get("range")) : null;
						const result = await pdf.splitPdf(
							Buffer.from(await files[0].arrayBuffer()),
							range,
							stem,
						);
						return new Response(new Uint8Array(result.data), {
							headers: {
								"content-type": result.mime,
								"content-disposition": contentDisposition(result.filename),
							},
						});
					}
					if (op === "images") {
						const images = files.map((f) => ({
							file: f,
							ext: normalizeExt(f.name),
						}));
						const bad = images.find(
							(i) => !i.ext || i.ext === "pdf" || i.ext === "svg",
						);
						if (bad || images.some((i) => !isImage(i.ext))) {
							return new Response(
								"Images to PDF accepts raster images (JPG, PNG, WebP, AVIF, GIF, TIFF, HEIC)",
								{ status: 415 },
							);
						}
						const data = await pdf.imagesToPdf(
							await Promise.all(
								images.map(async (i) => ({
									data: Buffer.from(await i.file.arrayBuffer()),
									ext: i.ext,
								})),
							),
						);
						return pdfResponse(data, `${stem}.pdf`, contentDisposition);
					}
					return new Response("Unknown operation", { status: 400 });
				} catch (e) {
					const message =
						e instanceof Error ? e.message : "PDF operation failed";
					return new Response(message, { status: 500 });
				}
			},
		},
	},
});

function isImage(ext: string): boolean {
	return ["jpg", "png", "webp", "avif", "gif", "tiff", "heic", "bmp"].includes(
		ext,
	);
}

function pdfResponse(
	data: Buffer,
	filename: string,
	contentDisposition: (name: string) => string,
): Response {
	return new Response(new Uint8Array(data), {
		headers: {
			"content-type": "application/pdf",
			"content-disposition": contentDisposition(filename),
		},
	});
}
