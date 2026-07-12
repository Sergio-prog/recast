import { createFileRoute } from "@tanstack/react-router";
import { CategoryPage } from "@/components/category-page";

export const Route = createFileRoute("/images")({
	head: () => ({ meta: [{ title: "Image converter — Recast" }] }),
	component: () => (
		<CategoryPage
			category="image"
			eyebrow="Image converter"
			title="Pictures, repacked."
			copy="Convert common web, camera and print image formats, turn images into PDFs, or move an animated GIF to video. Lower the quality control to reduce file size."
		/>
	),
});
