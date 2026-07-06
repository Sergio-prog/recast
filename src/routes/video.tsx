import { createFileRoute } from "@tanstack/react-router";
import { CategoryPage } from "@/components/category-page";

export const Route = createFileRoute("/video")({
	head: () => ({ meta: [{ title: "Video converter — Recast" }] }),
	component: () => (
		<CategoryPage
			category="video"
			eyebrow="Video converter"
			title="Motion, remuxed."
			copy="MP4, WebM, MOV, MKV and AVI both ways, video to GIF with a proper two-pass palette, and audio extraction straight to MP3 and friends. The quality knob maps to CRF for smaller files."
		/>
	),
});
