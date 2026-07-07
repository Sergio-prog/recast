import { parseTiktokenRanks, TiktokenBpe } from "./bpe";
import type { LoadedTokenizer } from "./types";

async function fetchGz(file: string): Promise<Response> {
	const res = await fetch(`/vocabs/${file}`);
	if (!res.ok || !res.body) {
		throw new Error(`vocabulary download failed (HTTP ${res.status})`);
	}
	return new Response(res.body.pipeThrough(new DecompressionStream("gzip")));
}

const APOS = "(?:'[sS]|'[tT]|'[rR][eE]|'[vV][eE]|'[mM]|'[lL][lL]|'[dD])";
const UPPER = String.raw`[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]`;
const LOWER = String.raw`[\p{Ll}\p{Lm}\p{Lo}\p{M}]`;
const UPPER_NO_HAN = String.raw`[[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]--[\p{Script=Han}]]`;
const LOWER_NO_HAN = String.raw`[[\p{Ll}\p{Lm}\p{Lo}\p{M}]--[\p{Script=Han}]]`;

export const PATTERNS = {
	o200k: new RegExp(
		[
			String.raw`[^\r\n\p{L}\p{N}]?${UPPER}*${LOWER}+${APOS}?`,
			String.raw`[^\r\n\p{L}\p{N}]?${UPPER}+${LOWER}*${APOS}?`,
			String.raw`\p{N}{1,3}`,
			String.raw` ?[^\s\p{L}\p{N}]+[\r\n/]*`,
			String.raw`\s*[\r\n]+`,
			String.raw`\s+(?!\S)`,
			String.raw`\s+`,
		].join("|"),
		"gu",
	),
	cl100k: new RegExp(
		[
			APOS,
			String.raw`[^\r\n\p{L}\p{N}]?\p{L}+`,
			String.raw`\p{N}{1,3}`,
			String.raw` ?[^\s\p{L}\p{N}]+[\r\n]*`,
			String.raw`\s*[\r\n]+`,
			String.raw`\s+(?!\S)`,
			String.raw`\s+`,
		].join("|"),
		"gu",
	),
	claude:
		/'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu,
	kimi: new RegExp(
		[
			String.raw`[\p{Script=Han}]+`,
			String.raw`[^\r\n\p{L}\p{N}]?${UPPER_NO_HAN}*${LOWER_NO_HAN}+${APOS}?`,
			String.raw`[^\r\n\p{L}\p{N}]?${UPPER_NO_HAN}+${LOWER_NO_HAN}*${APOS}?`,
			String.raw`\p{N}{1,3}`,
			String.raw` ?[^\s\p{L}\p{N}]+[\r\n]*`,
			String.raw`\s*[\r\n]+`,
			String.raw`\s+(?!\S)`,
			String.raw`\s+`,
		].join("|"),
		"gv",
	),
};

export function tiktokenLoader(file: string, pattern: RegExp, nfkc = false) {
	return async (): Promise<LoadedTokenizer> => {
		const ranks = parseTiktokenRanks(await (await fetchGz(file)).text());
		const bpe = new TiktokenBpe(ranks, pattern);
		if (!nfkc) return bpe;
		return { encode: (raw) => bpe.encode(raw.normalize("NFKC")) };
	};
}

export function hfLocalLoader(id: string) {
	return async (): Promise<LoadedTokenizer> => {
		const [{ PreTrainedTokenizer }, tokenizerJson, tokenizerConfig] =
			await Promise.all([
				import("@huggingface/transformers"),
				fetchGz(`${id}.tokenizer.bin`).then((r) => r.json()),
				fetchGz(`${id}.config.bin`).then((r) => r.json()),
			]);
		const tok = new PreTrainedTokenizer(tokenizerJson, tokenizerConfig);
		return {
			encode(text) {
				if (!text) return { count: 0, pieces: [] };
				const ids = tok.encode(text, { add_special_tokens: false });
				return {
					count: ids.length,
					pieces: ids.map((id) => ({
						id,
						text: tok.decode([id], { clean_up_tokenization_spaces: false }),
					})),
				};
			},
		};
	};
}
