import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "./proc";

const BSDTAR = process.env.BSDTAR_PATH ?? "bsdtar";

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
