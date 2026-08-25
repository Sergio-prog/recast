import { createFileRoute } from "@tanstack/react-router";

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

export const Route = createFileRoute("/api/removebg")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { DAY_MS, rateLimit, tooLarge } = await import(
					"@/server/limits"
				);
				const limited =
					rateLimit(request, "removebg", 3) ??
					rateLimit(request, "removebg-day", 30, DAY_MS) ??
					tooLarge(request, MAX_IMAGE_BYTES);
				if (limited) return limited;
				const form = await request.formData();
				const file = form.get("file");
				if (!(file instanceof File)) {
					return new Response("No image uploaded", { status: 400 });
				}
				const { DEFAULT_TOLERANCE, MAX_TOLERANCE, MIN_TOLERANCE } =
					await import("@/server/removebg");
				const tolerance = Math.min(
					MAX_TOLERANCE,
					Math.max(
						MIN_TOLERANCE,
						Number(form.get("tolerance")) || DEFAULT_TOLERANCE,
					),
				);
				try {
					const { removeBackground } = await import("@/server/removebg");
					const result = await removeBackground(
						Buffer.from(await file.arrayBuffer()),
						tolerance,
					);
					return new Response(new Uint8Array(result), {
						headers: { "content-type": "image/png" },
					});
				} catch (e) {
					console.error("[removebg]", e);
					return new Response(
						"This image could not be processed — try a JPG, PNG or WebP",
						{ status: 422 },
					);
				}
			},
		},
	},
});
