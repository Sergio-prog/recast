import { type Browser, chromium } from "playwright-core";

let browserPromise: Promise<Browser> | null = null;

function getBrowser(): Promise<Browser> {
	if (!browserPromise) {
		browserPromise = chromium
			.launch({
				executablePath: process.env.CHROMIUM_PATH || undefined,
				args: process.env.CHROMIUM_NO_SANDBOX === "1" ? ["--no-sandbox"] : [],
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
		const detail = e instanceof Error ? e.message.split("\n")[0] : "";
		throw new Error(
			`Chromium is not available (${detail}). Install it with: bunx playwright-core install chromium-headless-shell — or point CHROMIUM_PATH at a Chrome/Chromium binary.`,
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
