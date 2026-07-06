import { randomBytes } from "node:crypto";
import { getPool } from "./auth";

let schemaReady: Promise<void> | null = null;

function init(): Promise<void> {
	schemaReady ??= (async () => {
		const pool = getPool();
		await pool.query(`CREATE TABLE IF NOT EXISTS paste (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			name TEXT NOT NULL,
			description TEXT NOT NULL DEFAULT '',
			tags JSONB NOT NULL DEFAULT '[]',
			language TEXT NOT NULL DEFAULT 'text',
			visibility TEXT NOT NULL DEFAULT 'unlisted',
			content TEXT NOT NULL,
			created_at BIGINT NOT NULL,
			expires_at BIGINT
		)`);
		await pool.query(
			"CREATE INDEX IF NOT EXISTS paste_user ON paste (user_id, created_at DESC)",
		);
	})();
	return schemaReady;
}

export type Paste = {
	id: string;
	userId: string;
	name: string;
	description: string;
	tags: Array<string>;
	language: string;
	visibility: "unlisted" | "private";
	content: string;
	createdAt: number;
	expiresAt: number | null;
};

type PasteRow = {
	id: string;
	user_id: string;
	name: string;
	description: string;
	tags: Array<string>;
	language: string;
	visibility: string;
	content: string;
	created_at: string;
	expires_at: string | null;
};

const EXPIRY_MS: Record<string, number | null> = {
	"1h": 60 * 60 * 1000,
	"1d": 24 * 60 * 60 * 1000,
	"7d": 7 * 24 * 60 * 60 * 1000,
	"30d": 30 * 24 * 60 * 60 * 1000,
	never: null,
};

export async function createPaste(input: {
	userId: string;
	name: string;
	description: string;
	tags: Array<string>;
	language: string;
	visibility: "unlisted" | "private";
	content: string;
	expiry: string;
}): Promise<string> {
	await init();
	await sweepExpired();
	const id = randomBytes(8).toString("base64url");
	const ttl = EXPIRY_MS[input.expiry] ?? EXPIRY_MS["7d"];
	const now = Date.now();
	await getPool().query(
		`INSERT INTO paste (id, user_id, name, description, tags, language, visibility, content, created_at, expires_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		[
			id,
			input.userId,
			input.name,
			input.description,
			JSON.stringify(input.tags),
			input.language,
			input.visibility,
			input.content,
			now,
			ttl === null ? null : now + ttl,
		],
	);
	return id;
}

export async function getPaste(id: string): Promise<Paste | null> {
	await init();
	const { rows } = await getPool().query<PasteRow>(
		"SELECT * FROM paste WHERE id = $1",
		[id],
	);
	const row = rows[0];
	if (!row) return null;
	if (row.expires_at !== null && Number(row.expires_at) < Date.now()) {
		await getPool().query("DELETE FROM paste WHERE id = $1", [id]);
		return null;
	}
	return toPaste(row);
}

export async function listPastes(
	userId: string,
): Promise<Array<Omit<Paste, "content">>> {
	await init();
	await sweepExpired();
	const { rows } = await getPool().query<PasteRow>(
		"SELECT * FROM paste WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100",
		[userId],
	);
	return rows.map((row) => {
		const { content: _content, ...rest } = toPaste(row);
		return rest;
	});
}

export async function deletePaste(
	id: string,
	userId: string,
): Promise<boolean> {
	await init();
	const result = await getPool().query(
		"DELETE FROM paste WHERE id = $1 AND user_id = $2",
		[id, userId],
	);
	return (result.rowCount ?? 0) > 0;
}

async function sweepExpired(): Promise<void> {
	await getPool().query(
		"DELETE FROM paste WHERE expires_at IS NOT NULL AND expires_at < $1",
		[Date.now()],
	);
}

function toPaste(row: PasteRow): Paste {
	return {
		id: row.id,
		userId: row.user_id,
		name: row.name,
		description: row.description,
		tags: row.tags,
		language: row.language,
		visibility: row.visibility === "private" ? "private" : "unlisted",
		content: row.content,
		createdAt: Number(row.created_at),
		expiresAt: row.expires_at === null ? null : Number(row.expires_at),
	};
}
