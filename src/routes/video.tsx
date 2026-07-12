import { createFileRoute } from "@tanstack/react-router";
import { CategoryPage } from "@/components/category-page";

export const Route = createFileRoute("/video")({
	head: () => ({ meta: [{ title: "Video converter — Recast" }] }),
	component: () => (
		<CategoryPage
			category="video"
			eyebrow="Video converter"
			title="Motion, remuxed."
			copy="Convert modern, legacy and mobile video formats, create a two-pass GIF, or extract the audio track. The quality control maps to efficient codec settings for smaller files."
		/>
	),
});
