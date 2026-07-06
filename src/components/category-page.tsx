import { ArrowRightIcon } from "@phosphor-icons/react";
import { Dropzone } from "@/components/dropzone";
import { FormatTicker } from "@/components/format-ticker";
import { Workbench } from "@/components/workbench";
import { useWorkbench } from "@/hooks/use-workbench";
import {
	CATEGORY_META,
	type Category,
	FORMATS,
	POPULAR_PAIRS,
} from "@/lib/formats";

type CategoryPageProps = {
	category: Category;
	eyebrow: string;
	title: string;
	copy: string;
};

export function CategoryPage({
	category,
	eyebrow,
	title,
	copy,
}: CategoryPageProps) {
	const bench = useWorkbench([category]);
	const pairs = POPULAR_PAIRS.filter(
		([from]) => FORMATS[from]?.category === category,
	);
	return (
		<main>
			<section className="mx-auto w-full max-w-5xl px-4 pb-8 pt-14">
				<p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
					{eyebrow}
				</p>
				<h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
					{title}
				</h1>
				<div className="mt-7 overflow-hidden">
					<FormatTicker override={bench.override} pairs={pairs} />
				</div>
				<p className="mt-5 max-w-xl text-muted-foreground">{copy}</p>
			</section>
			<section className="mx-auto w-full max-w-5xl px-4 pb-6">
				<Dropzone
					onFiles={bench.addFiles}
					hint={`or click to browse — ${CATEGORY_META[category].label.toLowerCase()} only on this page`}
				/>
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
			<section className="mx-auto w-full max-w-5xl px-4 pb-20">
				<div className="flex flex-wrap gap-2">
					{pairs.map(([from, to]) => (
						<button
							key={`${from}-${to}`}
							type="button"
							onClick={() => bench.pick([from, to])}
							className="inline-flex items-center gap-1 rounded-md border bg-card px-2 py-1 font-mono text-xs uppercase transition-colors hover:border-primary hover:text-primary"
						>
							{from}
							<ArrowRightIcon className="size-3" />
							{to}
						</button>
					))}
				</div>
			</section>
		</main>
	);
}
