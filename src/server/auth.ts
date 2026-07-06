import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { betterAuth } from "better-auth";

const dataDir = process.env.DATA_DIR ?? "data";
mkdirSync(dataDir, { recursive: true });

export const db = new Database(join(dataDir, "ultra.db"));
db.run("PRAGMA journal_mode = WAL");

export const googleConfigured = Boolean(
	process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

export const auth = betterAuth({
	database: db,
	secret:
		process.env.BETTER_AUTH_SECRET ??
		"ultra-convert-dev-secret-never-use-in-production",
	baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
	socialProviders: googleConfigured
		? {
				google: {
					clientId: process.env.GOOGLE_CLIENT_ID as string,
					clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
				},
			}
		: {},
});

export async function sessionUser(
	request: Request,
): Promise<{ id: string; name: string } | null> {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) return null;
	return { id: session.user.id, name: session.user.name };
}
