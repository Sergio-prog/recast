import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { run } from "./proc";

const BSDTAR = process.env.BSDTAR_PATH ?? "bsdtar";

export async function createZip(
	entries: Array<{ name: string; data: Buffer }>,
): Promise<Buffer> {
	const dir = await mkdtemp(join(tmpdir(), "ultra-zip-"));
	try {
		const files = dir;
		for (const entry of entries) {
			await writeFile(join(files, entry.name.replaceAll("/", "_")), entry.data);
		}
		const outPath = join(
			await mkdtemp(join(tmpdir(), "ultra-out-")),
			"out.zip",
		);
		await run(BSDTAR, ["-c", "-a", "-f", outPath, "-C", files, "."], 300_000);
		const zip = await readFile(outPath);
		await rm(dirname(outPath), { recursive: true, force: true });
		return zip;
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

export async function convertArchive(
	input: Buffer,
	src: string,
	dst: string,
): Promise<Buffer> {
	const dir = await mkdtemp(join(tmpdir(), "ultra-"));
	try {
		const inPath = join(dir, `in.${src}`);
		const outPath = join(dir, `out.${dst}`);
		await writeFile(inPath, input);
		await run(BSDTAR, ["-c", "-a", "-f", outPath, `@${inPath}`], 300_000);
		return await readFile(outPath);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}
