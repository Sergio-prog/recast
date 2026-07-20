import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/paste")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const { parsePasteSearch } = await import("@/lib/paste-search");
				const parsed = parsePasteSearch(new URL(request.url).searchParams);
				if (!parsed.ok) {
					return new Response(parsed.error, { status: 400 });
				}
				const { dbConfigured, sessionUser } = await import("@/server/auth");
				if (!dbConfigured) return dbMissing();
				const user = await sessionUser(request);
				if (!user) return new Response("Sign in required", { status: 401 });
				const { listPastes } = await import("@/server/pastes");
				return Response.json(await listPastes(user.id, parsed.filters));
			},
			POST: async ({ request }) => {
				const { maxPasteBytes, rateLimit, tooLarge } = await import(
					"@/server/limits"
				);
				const limited =
					rateLimit(request, "paste", 10) ??
					tooLarge(request, maxPasteBytes + 4096);
				if (limited) return limited;
				const { dbConfigured, sessionUser } = await import("@/server/auth");
				if (!dbConfigured) return dbMissing();
				const user = await sessionUser(request);
				if (!user) return new Response("Sign in required", { status: 401 });
				let body: Record<string, unknown>;
				try {
					body = await request.json();
				} catch {
					return new Response("Invalid JSON body", { status: 400 });
				}
				const content = typeof body.content === "string" ? body.content : "";
				if (!content.trim()) {
					return new Response("Paste content is empty", { status: 400 });
				}
				if (new TextEncoder().encode(content).length > maxPasteBytes) {
					return new Response(
						`Paste too large — the limit is ${Math.round(maxPasteBytes / 1024)} KB`,
						{ status: 413 },
					);
				}
				const name =
					typeof body.name === "string" && body.name.trim()
						? body.name.trim().slice(0, 120)
						: "Untitled paste";
				const description =
					typeof body.description === "string"
						? body.description.trim().slice(0, 500)
						: "";
				const tags = Array.isArray(body.tags)
					? body.tags
							.filter((t): t is string => typeof t === "string")
							.map((t) => t.trim().toLowerCase().slice(0, 24))
							.filter(Boolean)
							.slice(0, 10)
					: [];
				const language =
					typeof body.language === "string"
						? body.language.slice(0, 24)
						: "text";
				const visibility =
					body.visibility === "private" ? "private" : "unlisted";
				const expiry = typeof body.expiry === "string" ? body.expiry : "7d";
				const { createPaste } = await import("@/server/pastes");
				const id = await createPaste({
					userId: user.id,
					name,
					description,
					tags,
					language,
					visibility,
					content,
					expiry,
				});
				return Response.json({ id });
			},
		},
	},
});

function dbMissing(): Response {
	return new Response(
		"The pastebin requires a database — set DATABASE_URL to your Supabase connection string",
		{ status: 503 },
	);
}
