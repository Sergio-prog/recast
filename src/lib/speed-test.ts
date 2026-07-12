const MB = 1024 * 1024;
const DOWNLOAD_BYTES = 1024 * MB;
const UPLOAD_BYTES = 64 * MB;
const TEST_DURATION_MS = 7_000;
const WARMUP_MS = 1_000;
const UPDATE_INTERVAL_MS = 100;

export type ThroughputUpdate = (mbps: number) => void;

function makePayload(bytes: number): Uint8Array<ArrayBuffer> {
	const chunk = new Uint8Array(65_536);
	crypto.getRandomValues(chunk);
	const payload = new Uint8Array(bytes);
	for (let offset = 0; offset < bytes; offset += chunk.length) {
		payload.set(
			chunk.subarray(0, Math.min(chunk.length, bytes - offset)),
			offset,
		);
	}
	return payload;
}

function createMeter(onUpdate: ThroughputUpdate) {
	const started = performance.now();
	let measuredBytes = 0;
	let lastUpdate = started;

	return {
		add(bytes: number) {
			const now = performance.now();
			if (now - started >= WARMUP_MS) measuredBytes += bytes;
			if (now - lastUpdate >= UPDATE_INTERVAL_MS) {
				lastUpdate = now;
				const measuredMs = now - started - WARMUP_MS;
				if (measuredMs > 0) onUpdate((measuredBytes * 8) / measuredMs / 1_000);
			}
		},
		result() {
			const measuredMs = Math.max(1, performance.now() - started - WARMUP_MS);
			return (measuredBytes * 8) / measuredMs / 1_000;
		},
		shouldContinue() {
			return performance.now() - started < TEST_DURATION_MS;
		},
	};
}

export async function measureDownload(onUpdate: ThroughputUpdate) {
	const meter = createMeter(onUpdate);
	const controller = new AbortController();

	async function worker() {
		while (meter.shouldContinue()) {
			const response = await fetch(
				`/api/speed?bytes=${DOWNLOAD_BYTES}&nonce=${crypto.randomUUID()}`,
				{ cache: "no-store", signal: controller.signal },
			);
			if (!response.ok || !response.body)
				throw new Error(await response.text());
			const reader = response.body.getReader();
			while (meter.shouldContinue()) {
				const { done, value } = await reader.read();
				if (done) break;
				meter.add(value.byteLength);
			}
			await reader.cancel();
		}
	}

	try {
		await Promise.all([worker(), worker(), worker(), worker()]);
	} finally {
		controller.abort();
	}
	return meter.result();
}

function upload(
	payload: Uint8Array<ArrayBuffer>,
	meter: ReturnType<typeof createMeter>,
) {
	return new Promise<void>((resolve, reject) => {
		const request = new XMLHttpRequest();
		request.open("POST", "/api/speed");
		let previous = 0;
		request.upload.onprogress = (event) => {
			meter.add(Math.max(0, event.loaded - previous));
			previous = event.loaded;
		};
		request.onload = () => {
			if (request.status >= 200 && request.status < 300) resolve();
			else reject(new Error(request.responseText || "Upload test failed"));
		};
		request.onerror = () => reject(new Error("Upload test failed"));
		request.send(payload);
	});
}

export async function measureUpload(onUpdate: ThroughputUpdate) {
	const payload = makePayload(UPLOAD_BYTES);
	const meter = createMeter(onUpdate);

	async function worker() {
		while (meter.shouldContinue()) await upload(payload, meter);
	}

	await Promise.all([worker(), worker(), worker()]);
	return meter.result();
}
