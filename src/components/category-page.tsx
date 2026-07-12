import { Dropzone } from "@/components/dropzone";
import { Workbench } from "@/components/workbench";
import { useWorkbench } from "@/hooks/use-workbench";
import { CATEGORY_META, type Category, FORMATS } from "@/lib/formats";

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
	const formats = Object.values(FORMATS).filter(
		(format) => format.category === category,
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
				<p className="mt-5 max-w-xl text-muted-foreground">{copy}</p>
				<p className="mt-5 max-w-3xl font-mono text-xs leading-6 text-muted-foreground">
					<span className="mr-2 uppercase tracking-widest text-foreground">
						Supported
					</span>
					{formats.map((format) => format.label).join(" · ")}
				</p>
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
			<div className="pb-14" />
		</main>
	);
}
