import { createFileRoute } from "@tanstack/react-router";
import { CategoryPage } from "@/components/category-page";

export const Route = createFileRoute("/audio")({
	head: () => ({ meta: [{ title: "Audio converter — Recast" }] }),
	component: () => (
		<CategoryPage
			category="audio"
			eyebrow="Audio converter"
			title="Sound, resampled."
			copy="Convert compressed, lossless and legacy audio formats in any direction. Lower the quality control to shrink podcasts, music and voice notes."
		/>
	),
});
