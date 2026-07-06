import { createFileRoute } from "@tanstack/react-router";
import { CategoryPage } from "@/components/category-page";

export const Route = createFileRoute("/audio")({
	head: () => ({ meta: [{ title: "Audio converter — ultra.convert" }] }),
	component: () => (
		<CategoryPage
			category="audio"
			eyebrow="Audio converter"
			title="Sound, resampled."
			copy="MP3, WAV, OGG, Opus, FLAC, AAC and M4A in any direction. The quality knob sets the bitrate — drag it down to shrink podcasts and voice notes."
		/>
	),
});
