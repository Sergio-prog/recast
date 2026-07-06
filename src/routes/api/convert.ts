import { createFileRoute } from "@tanstack/react-router";
import { normalizeExt, targetsFor } from "@/lib/formats";

export const Route = createFileRoute("/api/convert")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { maxUploadBytes, rateLimit, tooLarge } = await import(
					"@/server/limits"
				);
				const limited =
					rateLimit(request, "convert", 30) ??
					tooLarge(request, maxUploadBytes);
				if (limited) return limited;
				const form = await request.formData();
				const file = form.get("file");
				const target = String(form.get("target") ?? "");
				const quality = Math.min(
					100,
					Math.max(1, Number(form.get("quality")) || 82),
				);
				if (!(file instanceof File)) {
					return new Response("No file uploaded", { status: 400 });
				}
				const src = normalizeExt(file.name);
				if (!src) {
					return new Response(`Unsupported file type: ${file.name}`, {
						status: 415,
					});
				}
				if (!targetsFor(src).includes(target)) {
					return new Response(`Cannot convert .${src} to .${target}`, {
						status: 415,
					});
				}
				try {
					const { convert } = await import("@/server/convert");
					const { contentDisposition } = await import("@/server/http");
					const result = await convert(
						Buffer.from(await file.arrayBuffer()),
						file.name,
						src,
						target,
						quality,
					);
					return new Response(new Uint8Array(result.data), {
						headers: {
							"content-type": result.mime,
							"content-disposition": contentDisposition(result.filename),
						},
					});
				} catch (e) {
					const message = e instanceof Error ? e.message : "Conversion failed";
					return new Response(message, { status: 500 });
				}
			},
		},
	},
});
