export type ModelProgress = {
	status: string;
	file?: string;
	progress?: number;
};

export const MODEL_ID = "briaai/RMBG-1.4";
const INPUT_SIZE = 1024;
const MAX_OUTPUT_SIZE = 2048;

type Transformers = typeof import("@huggingface/transformers");

type Bundle = {
	transformers: Transformers;
	model: (feeds: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

let bundlePromise: Promise<Bundle> | null = null;

function loadModel(onProgress: (progress: ModelProgress) => void): Promise<Bundle> {
	bundlePromise ??= (async () => {
		const transformers = await import("@huggingface/transformers");
		const model = await transformers.AutoModel.from_pretrained(MODEL_ID, {
			config: { model_type: "custom" } as never,
			dtype: "q8",
			progress_callback: (p: unknown) => onProgress(p as ModelProgress),
		});
		return {
			transformers,
			model: model as unknown as Bundle["model"],
		};
	})().catch((error) => {
		bundlePromise = null;
		throw error;
	});
	return bundlePromise;
}

async function predictMask(
	bundle: Bundle,
	url: string,
): Promise<{ mask: Float32Array; sourceUrl: string }> {
	const { transformers } = bundle;
	const image = await transformers.RawImage.fromURL(url);
	const resized = await image.rgb().resize(INPUT_SIZE, INPUT_SIZE);
	const plane = INPUT_SIZE * INPUT_SIZE;
	const data = new Float32Array(3 * plane);
	for (let i = 0; i < plane; i++) {
		data[i] = resized.data[i * 3] / 255 - 0.5;
		data[i + plane] = resized.data[i * 3 + 1] / 255 - 0.5;
		data[i + 2 * plane] = resized.data[i * 3 + 2] / 255 - 0.5;
	}
	const input = new transformers.Tensor("float32", data, [
		1,
		3,
		INPUT_SIZE,
		INPUT_SIZE,
	]);
	const outputs = await bundle.model({ input });
	const first = (outputs.output ?? Object.values(outputs)[0]) as {
		data: Float32Array;
	};
	const raw = first.data;
	let min = Number.POSITIVE_INFINITY;
	let max = Number.NEGATIVE_INFINITY;
	for (const value of raw) {
		if (value < min) min = value;
		if (value > max) max = value;
	}
	const range = max - min || 1;
	const mask = new Float32Array(plane);
	for (let i = 0; i < plane; i++) {
		mask[i] = (raw[i] - min) / range;
	}
	return { mask, sourceUrl: url };
}

export async function removeBackground(
	file: File,
	onProgress: (progress: ModelProgress) => void,
): Promise<Blob> {
	const bundle = await loadModel(onProgress);
	const url = URL.createObjectURL(file);
	try {
		const { mask } = await predictMask(bundle, url);

		const bitmap = await createImageBitmap(file);
		const ratio = Math.min(
			1,
			MAX_OUTPUT_SIZE / Math.max(bitmap.width, bitmap.height),
		);
		const width = Math.max(1, Math.round(bitmap.width * ratio));
		const height = Math.max(1, Math.round(bitmap.height * ratio));

		const maskCanvas = document.createElement("canvas");
		maskCanvas.width = INPUT_SIZE;
		maskCanvas.height = INPUT_SIZE;
		const maskCtx = maskCanvas.getContext("2d");
		if (!maskCtx) throw new Error("Canvas is not available");
		const maskPixels = maskCtx.createImageData(INPUT_SIZE, INPUT_SIZE);
		for (let i = 0; i < mask.length; i++) {
			maskPixels.data[i * 4 + 3] = Math.round(mask[i] * 255);
		}
		maskCtx.putImageData(maskPixels, 0, 0);

		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("Canvas is not available");
		ctx.drawImage(bitmap, 0, 0, width, height);
		ctx.globalCompositeOperation = "destination-in";
		ctx.drawImage(maskCanvas, 0, 0, width, height);
		bitmap.close();

		const blob = await new Promise<Blob | null>((resolve) =>
			canvas.toBlob(resolve, "image/png"),
		);
		if (!blob) throw new Error("Could not encode the result");
		return blob;
	} finally {
		URL.revokeObjectURL(url);
	}
}
