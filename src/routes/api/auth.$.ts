import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			ANY: async ({ request }) => {
				const { dbConfigured, getAuth } = await import("@/server/auth");
				if (!dbConfigured) {
					return new Response(
						"Auth is not configured — set DATABASE_URL to your Supabase connection string",
						{ status: 503 },
					);
				}
				return getAuth().handler(request);
			},
		},
	},
});
