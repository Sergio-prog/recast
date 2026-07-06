import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { Dropzone } from "@/components/dropzone";
import { FormatTicker } from "@/components/format-ticker";
import { ToolDirectory } from "@/components/tool-directory";
import { Workbench } from "@/components/workbench";
import { useWorkbench } from "@/hooks/use-workbench";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	const bench = useWorkbench();
	const workbenchRef = useRef<HTMLElement>(null);

	const pick = (pair: readonly [string, string]) => {
		bench.pick(pair);
		workbenchRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	return (
		<main>
			<section className="mx-auto w-full max-w-5xl px-4 pb-8 pt-14">
				<p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
					File conversion workbench
				</p>
				<h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
					Any file, any format.
				</h1>
				<div className="mt-7 overflow-hidden">
					<FormatTicker override={bench.override} />
				</div>
				<p className="mt-5 max-w-xl text-muted-foreground">
					Convert and compress images, video, audio, GIFs, archives and PDFs. To
					shrink a file without changing its type, keep the same target and
					lower the quality.
				</p>
			</section>
			<section
				ref={workbenchRef}
				className="mx-auto w-full max-w-5xl scroll-mt-20 px-4"
			>
				<Dropzone onFiles={bench.addFiles} />
				{bench.jobs.length > 0 && (
					<Workbench
						jobs={bench.jobs}
						onUpdate={bench.update}
						onRemove={bench.remove}
						onConvert={bench.convert}
						onConvertAll={bench.convertAll}
						onClear={bench.clear}
					/>
				)}
			</section>
			<ToolDirectory onPick={pick} />
		</main>
	);
}
