import { createFileRoute } from "@tanstack/react-router";
import { CategoryPage } from "@/components/category-page";

export const Route = createFileRoute("/images")({
	head: () => ({ meta: [{ title: "Image converter — ultra.convert" }] }),
	component: () => (
		<CategoryPage
			category="image"
			eyebrow="Image converter"
			title="Pictures, repacked."
			copy="JPG, PNG, WebP, AVIF, GIF, TIFF and BMP both ways — plus HEIC and SVG input, image to PDF, and GIF to video. Lower the quality knob to compress without changing format."
		/>
	),
});
