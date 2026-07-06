import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/paste/$id")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				const { rateLimit } = await import("@/server/limits");
				const limited = rateLimit(request, "paste-read", 60);
				if (limited) return limited;
				const { getPaste } = await import("@/server/pastes");
				const paste = getPaste(params.id);
				if (!paste) return new Response("Paste not found", { status: 404 });
				const { sessionUser } = await import("@/server/auth");
				const user = await sessionUser(request);
				const mine = user?.id === paste.userId;
				if (paste.visibility === "private" && !mine) {
					return new Response("This paste is private", { status: 403 });
				}
				if (new URL(request.url).searchParams.has("raw")) {
					return new Response(paste.content, {
						headers: { "content-type": "text/plain; charset=utf-8" },
					});
				}
				const { userId: _userId, ...publicPaste } = paste;
				return Response.json({ ...publicPaste, mine });
			},
			DELETE: async ({ request, params }) => {
				const { sessionUser } = await import("@/server/auth");
				const user = await sessionUser(request);
				if (!user) return new Response("Sign in required", { status: 401 });
				const { deletePaste } = await import("@/server/pastes");
				if (!deletePaste(params.id, user.id)) {
					return new Response("Paste not found", { status: 404 });
				}
				return new Response(null, { status: 204 });
			},
		},
	},
});
