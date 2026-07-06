import { betterAuth } from "better-auth";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

export const dbConfigured = Boolean(connectionString);
export const googleConfigured = Boolean(
	process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

let pool: Pool | null = null;

export function getPool(): Pool {
	if (!connectionString) {
		throw new Error(
			"DATABASE_URL is not set — create a Supabase project and set its connection string",
		);
	}
	pool ??= new Pool({ connectionString, max: 5 });
	return pool;
}

function buildAuth() {
	return betterAuth({
		database: getPool(),
		secret:
			process.env.BETTER_AUTH_SECRET ??
			"recast-dev-secret-never-use-in-production",
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
}

let authInstance: ReturnType<typeof buildAuth> | null = null;

export function getAuth(): ReturnType<typeof buildAuth> {
	authInstance ??= buildAuth();
	return authInstance;
}

export async function sessionUser(
	request: Request,
): Promise<{ id: string; name: string } | null> {
	if (!dbConfigured) return null;
	const session = await getAuth().api.getSession({
		headers: request.headers,
	});
	if (!session?.user) return null;
	return { id: session.user.id, name: session.user.name };
}
