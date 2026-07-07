import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "../public/vocabs");
mkdirSync(outDir, { recursive: true });

const HUB = "https://huggingface.co";

type Source = {
	id: string;
	repo: string;
	kind: "hf" | "tiktoken";
};

const SOURCES: Array<Source> = [
	{ id: "deepseek", repo: "deepseek-ai/DeepSeek-V4-Pro", kind: "hf" },
	{ id: "glm", repo: "zai-org/GLM-5.2", kind: "hf" },
	{ id: "gemini", repo: "unsloth/gemma-3-4b-it", kind: "hf" },
	{ id: "kimi", repo: "moonshotai/Kimi-K2.7-Code", kind: "tiktoken" },
];

const OPENAI_RANKS = [
	{
		id: "gpt5",
		url: "https://openaipublic.blob.core.windows.net/encodings/o200k_base.tiktoken",
	},
	{
		id: "gpt4",
		url: "https://openaipublic.blob.core.windows.net/encodings/cl100k_base.tiktoken",
	},
];

async function downloadUrl(url: string): Promise<Buffer> {
	console.log(`  downloading ${url}`);
	const res = await fetch(url);
	if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
	return Buffer.from(await res.arrayBuffer());
}

function download(repo: string, file: string): Promise<Buffer> {
	return downloadUrl(`${HUB}/${repo}/resolve/main/${file}`);
}

function claudeRanksToTiktokenLines(): string {
	const require = createRequire(import.meta.url);
	const claude = require("@anthropic-ai/tokenizer/claude.json") as {
		bpe_ranks: string;
	};
	const lines: Array<string> = [];
	for (const row of claude.bpe_ranks.split("\n").filter(Boolean)) {
		const [, offsetStr, ...tokens] = row.split(" ");
		tokens.forEach((token, i) =>
			lines.push(`${token} ${Number(offsetStr) + i}`),
		);
	}
	return lines.join("\n");
}

function writeGz(name: string, data: Buffer | string): void {
	const gz = gzipSync(data, { level: 9 });
	writeFileSync(join(outDir, name), gz);
	const mb = (n: number) => (n / 1024 / 1024).toFixed(1);
	console.log(`  ${name}: ${mb(Buffer.byteLength(data))} MB -> ${mb(gz.length)} MB gz`);
}

for (const src of SOURCES) {
	const target =
		src.kind === "hf" ? `${src.id}.tokenizer.bin` : `${src.id}.tiktoken.bin`;
	if (existsSync(join(outDir, target))) {
		console.log(`${src.id}: already present, skipping`);
		continue;
	}
	console.log(`${src.id} (${src.repo})`);
	if (src.kind === "hf") {
		const tokenizer = await download(src.repo, "tokenizer.json");
		const config = await download(src.repo, "tokenizer_config.json");
		writeGz(
			`${src.id}.tokenizer.bin`,
			JSON.stringify(JSON.parse(tokenizer.toString())),
		);
		writeGz(
			`${src.id}.config.bin`,
			JSON.stringify(JSON.parse(config.toString())),
		);
	} else {
		writeGz(target, await download(src.repo, "tiktoken.model"));
	}
}

for (const src of OPENAI_RANKS) {
	const target = `${src.id}.tiktoken.bin`;
	if (existsSync(join(outDir, target))) {
		console.log(`${src.id}: already present, skipping`);
		continue;
	}
	console.log(src.id);
	writeGz(target, await downloadUrl(src.url));
}

if (!existsSync(join(outDir, "claude.tiktoken.bin"))) {
	console.log("claude (from @anthropic-ai/tokenizer)");
	writeGz("claude.tiktoken.bin", claudeRanksToTiktokenLines());
}
console.log("done");
