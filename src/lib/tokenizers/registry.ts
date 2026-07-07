import { hfLocalLoader, PATTERNS, tiktokenLoader } from "./adapters";
import type { LoadedTokenizer, ModelSpec } from "./types";

export const MODELS: Array<ModelSpec> = [
	{
		id: "gpt5",
		vendor: "OpenAI",
		label: "GPT-5.x",
		fidelity: "exact",
		note: "o200k_base — also GPT-4o / o-series",
		sizeLabel: "1.6 MB",
		load: tiktokenLoader("gpt5.tiktoken.bin", PATTERNS.o200k),
	},
	{
		id: "gpt4",
		vendor: "OpenAI",
		label: "GPT-4",
		fidelity: "exact",
		note: "cl100k_base — also GPT-3.5",
		sizeLabel: "0.7 MB",
		load: tiktokenLoader("gpt4.tiktoken.bin", PATTERNS.cl100k),
	},
	{
		id: "claude",
		vendor: "Anthropic",
		label: "Claude 4.x",
		fidelity: "estimate",
		note: "Anthropic has not published the Claude 3+ tokenizer; this is their last public one",
		sizeLabel: "0.5 MB",
		load: tiktokenLoader("claude.tiktoken.bin", PATTERNS.claude, true),
	},
	{
		id: "gemini",
		vendor: "Google",
		label: "Gemini 3",
		fidelity: "estimate",
		note: "via Gemma 3 — same tokenizer family, Gemini production vocabulary is unpublished",
		sizeLabel: "4.7 MB",
		load: hfLocalLoader("gemini"),
	},
	{
		id: "deepseek",
		vendor: "DeepSeek",
		label: "DeepSeek V4",
		fidelity: "exact",
		note: "official V4 vocabulary",
		sizeLabel: "1.7 MB",
		load: hfLocalLoader("deepseek"),
	},
	{
		id: "kimi",
		vendor: "Moonshot",
		label: "Kimi K2.7",
		fidelity: "exact",
		note: "official K2.7 vocabulary",
		sizeLabel: "1.3 MB",
		load: tiktokenLoader("kimi.tiktoken.bin", PATTERNS.kimi),
	},
	{
		id: "glm",
		vendor: "Z.ai",
		label: "GLM-5.2",
		fidelity: "exact",
		note: "official 5.2 vocabulary",
		sizeLabel: "2.6 MB",
		load: hfLocalLoader("glm"),
	},
];

const inflight = new Map<string, Promise<LoadedTokenizer>>();

export function loadModel(spec: ModelSpec): Promise<LoadedTokenizer> {
	let promise = inflight.get(spec.id);
	if (!promise) {
		promise = spec.load();
		promise.catch(() => inflight.delete(spec.id));
		inflight.set(spec.id, promise);
	}
	return promise;
}
