import { randomBytes } from "node:crypto";
import { db } from "./auth";

db.run(`CREATE TABLE IF NOT EXISTS paste (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	name TEXT NOT NULL,
	description TEXT NOT NULL DEFAULT '',
	tags TEXT NOT NULL DEFAULT '[]',
	language TEXT NOT NULL DEFAULT 'text',
	visibility TEXT NOT NULL DEFAULT 'unlisted',
	content TEXT NOT NULL,
	created_at INTEGER NOT NULL,
	expires_at INTEGER
)`);
db.run("CREATE INDEX IF NOT EXISTS paste_user ON paste (user_id, created_at)");

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
	tags: string;
	language: string;
	visibility: string;
	content: string;
	created_at: number;
	expires_at: number | null;
};

const EXPIRY_MS: Record<string, number | null> = {
	"1h": 60 * 60 * 1000,
	"1d": 24 * 60 * 60 * 1000,
	"7d": 7 * 24 * 60 * 60 * 1000,
	"30d": 30 * 24 * 60 * 60 * 1000,
	never: null,
};

export function createPaste(input: {
	userId: string;
	name: string;
	description: string;
	tags: Array<string>;
	language: string;
	visibility: "unlisted" | "private";
	content: string;
	expiry: string;
}): string {
	sweepExpired();
	const id = randomBytes(8).toString("base64url");
	const ttl = EXPIRY_MS[input.expiry] ?? EXPIRY_MS["7d"];
	const now = Date.now();
	db.query(
		`INSERT INTO paste (id, user_id, name, description, tags, language, visibility, content, created_at, expires_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	).run(
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
	);
	return id;
}

export function getPaste(id: string): Paste | null {
	const row = db
		.query<PasteRow, [string]>("SELECT * FROM paste WHERE id = ?")
		.get(id);
	if (!row) return null;
	if (row.expires_at !== null && row.expires_at < Date.now()) {
		db.query("DELETE FROM paste WHERE id = ?").run(id);
		return null;
	}
	return toPaste(row);
}

export function listPastes(userId: string): Array<Omit<Paste, "content">> {
	sweepExpired();
	const rows = db
		.query<PasteRow, [string]>(
			"SELECT * FROM paste WHERE user_id = ? ORDER BY created_at DESC LIMIT 100",
		)
		.all(userId);
	return rows.map((row) => {
		const { content: _content, ...rest } = toPaste(row);
		return rest;
	});
}

export function deletePaste(id: string, userId: string): boolean {
	const result = db
		.query("DELETE FROM paste WHERE id = ? AND user_id = ?")
		.run(id, userId);
	return result.changes > 0;
}

function sweepExpired() {
	db.query(
		"DELETE FROM paste WHERE expires_at IS NOT NULL AND expires_at < ?",
	).run(Date.now());
}

function toPaste(row: PasteRow): Paste {
	return {
		id: row.id,
		userId: row.user_id,
		name: row.name,
		description: row.description,
		tags: JSON.parse(row.tags) as Array<string>,
		language: row.language,
		visibility: row.visibility === "private" ? "private" : "unlisted",
		content: row.content,
		createdAt: row.created_at,
		expiresAt: row.expires_at,
	};
}
