import type { EncodeResult, LoadedTokenizer, TokenPiece } from "./types";

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder("utf-8", { fatal: false });

function bytesToKey(bytes: Uint8Array): string {
	let key = "";
	for (let i = 0; i < bytes.length; i++) key += String.fromCharCode(bytes[i]);
	return key;
}

function keyToText(key: string): string {
	const bytes = new Uint8Array(key.length);
	for (let i = 0; i < key.length; i++) bytes[i] = key.charCodeAt(i);
	return utf8Decoder.decode(bytes);
}

export function parseTiktokenRanks(source: string): Map<string, number> {
	const ranks = new Map<string, number>();
	for (const line of source.split("\n")) {
		if (!line) continue;
		const sep = line.indexOf(" ");
		ranks.set(atob(line.slice(0, sep)), Number(line.slice(sep + 1)));
	}
	return ranks;
}

function bpeMerge(ranks: Map<string, number>, piece: string): Array<number> {
	const direct = ranks.get(piece);
	if (direct !== undefined) return [direct];

	const starts: Array<number> = [];
	const pairRanks: Array<number> = [];
	for (let i = 0; i <= piece.length; i++) starts.push(i);

	const rankAt = (i: number): number => {
		if (i + 2 >= starts.length) return Infinity;
		const rank = ranks.get(piece.slice(starts[i], starts[i + 2]));
		return rank === undefined ? Infinity : rank;
	};

	for (let i = 0; i < starts.length; i++) pairRanks.push(rankAt(i));

	while (true) {
		let minRank = Infinity;
		let minIdx = -1;
		for (let i = 0; i < pairRanks.length; i++) {
			if (pairRanks[i] < minRank) {
				minRank = pairRanks[i];
				minIdx = i;
			}
		}
		if (minIdx === -1) break;
		starts.splice(minIdx + 1, 1);
		pairRanks.splice(minIdx + 1, 1);
		pairRanks[minIdx] = rankAt(minIdx);
		if (minIdx > 0) pairRanks[minIdx - 1] = rankAt(minIdx - 1);
	}

	const ids: Array<number> = [];
	for (let i = 0; i < starts.length - 1; i++) {
		const id = ranks.get(piece.slice(starts[i], starts[i + 1]));
		if (id !== undefined) ids.push(id);
	}
	return ids;
}

export class TiktokenBpe implements LoadedTokenizer {
	private ranks: Map<string, number>;
	private pattern: RegExp;
	private idToKey = new Map<number, string>();

	constructor(ranks: Map<string, number>, pattern: RegExp) {
		this.ranks = ranks;
		this.pattern = pattern;
		for (const [key, id] of ranks) this.idToKey.set(id, key);
	}

	decode(ids: Array<number>): string {
		return keyToText(ids.map((id) => this.idToKey.get(id) ?? "").join(""));
	}

	encode(text: string): EncodeResult {
		const pieces: Array<TokenPiece> = [];
		for (const match of text.matchAll(this.pattern)) {
			const key = bytesToKey(utf8Encoder.encode(match[0]));
			for (const id of bpeMerge(this.ranks, key)) {
				pieces.push({ id, text: keyToText(this.idToKey.get(id) ?? "") });
			}
		}
		return { count: pieces.length, pieces };
	}
}
