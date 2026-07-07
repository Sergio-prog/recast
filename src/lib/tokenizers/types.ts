export type TokenPiece = {
	id: number;
	text: string;
};

export type EncodeResult = {
	count: number;
	pieces: Array<TokenPiece>;
};

export type LoadedTokenizer = {
	encode(text: string): EncodeResult;
};

export type Fidelity = "exact" | "estimate";

export type ModelSpec = {
	id: string;
	vendor: string;
	label: string;
	fidelity: Fidelity;
	note: string;
	sizeLabel: string;
	load(): Promise<LoadedTokenizer>;
};
