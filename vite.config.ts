import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	ssr: {
		external: [
			"pg",
			"sharp",
			"pdfjs-dist",
			"@napi-rs/canvas",
			"playwright-core",
			"fsevents",
		],
	},
	optimizeDeps: {
		exclude: [
			"pdfjs-dist",
			"@napi-rs/canvas",
			"pg",
			"playwright-core",
			"fsevents",
		],
	},
	plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
});

export default config;
