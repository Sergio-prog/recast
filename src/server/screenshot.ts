import { type Browser, chromium } from "playwright-core";

let browserPromise: Promise<Browser> | null = null;

function getBrowser(): Promise<Browser> {
	if (!browserPromise) {
		browserPromise = chromium
			.launch({
				executablePath: process.env.CHROMIUM_PATH || undefined,
				args:
					process.env.CHROMIUM_NO_SANDBOX === "1"
						? ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
						: [],
			})
			.then((browser) => {
				browser.on("disconnected", () => {
					browserPromise = null;
				});
				return browser;
			});
		browserPromise.catch(() => {
			browserPromise = null;
		});
	}
	return browserPromise;
}

export type ScreenshotOptions = {
	url: string;
	delayMs: number;
	width: number;
	height: number;
	fullPage: boolean;
	dark: boolean;
	format: "png" | "jpg";
	scale: 1 | 2;
};

export async function captureScreenshot(
	options: ScreenshotOptions,
): Promise<Buffer> {
	let browser: Browser;
	try {
		browser = await getBrowser();
	} catch (e) {
		console.error(
			"[screenshot] Chromium failed to launch. Install it with: bunx playwright-core install chromium-headless-shell — or point CHROMIUM_PATH at a Chrome/Chromium binary.",
			e,
		);
		throw new Error(
			"Screenshots are unavailable right now — the browser could not start on the server. Try again in a minute.",
		);
	}
	const context = await browser.newContext({
		viewport: { width: options.width, height: options.height },
		deviceScaleFactor: options.scale,
		colorScheme: options.dark ? "dark" : "light",
		reducedMotion: options.delayMs === 0 ? "reduce" : "no-preference",
	});
	try {
		const page = await context.newPage();
		await page.goto(options.url, { waitUntil: "load", timeout: 30_000 });
		if (options.delayMs > 0) await page.waitForTimeout(options.delayMs);
		const data = await page.screenshot({
			fullPage: options.fullPage,
			type: options.format === "jpg" ? "jpeg" : "png",
			quality: options.format === "jpg" ? 85 : undefined,
			timeout: 30_000,
		});
		return Buffer.from(data);
	} finally {
		await context.close();
	}
}
