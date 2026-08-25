declare module "gifenc" {
	export type GifPalette = Array<[number, number, number]>;

	export function GIFEncoder(): {
		writeFrame(
			index: Uint8Array,
			width: number,
			height: number,
			opts?: {
				palette?: GifPalette;
				delay?: number;
				repeat?: number;
				transparent?: boolean;
				transparentIndex?: number;
				dispose?: number;
				first?: boolean;
			},
		): void;
		finish(): void;
		bytes(): Uint8Array;
	};

	export function quantize(
		rgba: Uint8Array | Uint8ClampedArray,
		maxColors: number,
	): GifPalette;

	export function applyPalette(
		rgba: Uint8Array | Uint8ClampedArray,
		palette: GifPalette,
	): Uint8Array;
}
