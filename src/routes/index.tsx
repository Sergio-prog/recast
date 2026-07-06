import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Dropzone } from "@/components/dropzone";
import { FormatTicker } from "@/components/format-ticker";
import { ToolDirectory } from "@/components/tool-directory";
import { type Job, Workbench } from "@/components/workbench";
import { defaultTargetFor, normalizeExt, replaceExt } from "@/lib/formats";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	const [jobs, setJobs] = useState<Array<Job>>([]);
	const [hint, setHint] = useState<readonly [string, string] | null>(null);
	const preferred = useRef<Record<string, string>>({});
	const workbenchRef = useRef<HTMLElement>(null);

	const addFiles = (files: Array<File>) => {
		if (files.length === 0) return;
		setHint(null);
		setJobs((prev) => [
			...prev,
			...files.map((file): Job => {
				const ext = normalizeExt(file.name);
				return {
					id: crypto.randomUUID(),
					file,
					ext,
					target: ext ? (preferred.current[ext] ?? defaultTargetFor(ext)) : "",
					quality: 82,
					status: ext ? "ready" : "unsupported",
				};
			}),
		]);
	};

	const update = (id: string, patch: Partial<Job>) =>
		setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));

	const remove = (id: string) =>
		setJobs((prev) => {
			const job = prev.find((j) => j.id === id);
			if (job?.outUrl) URL.revokeObjectURL(job.outUrl);
			return prev.filter((j) => j.id !== id);
		});

	const clear = () =>
		setJobs((prev) => {
			for (const job of prev) {
				if (job.outUrl) URL.revokeObjectURL(job.outUrl);
			}
			return [];
		});

	const convertOne = async (job: Job) => {
		update(job.id, { status: "working", error: undefined });
		const form = new FormData();
		form.append("file", job.file);
		form.append("target", job.target);
		form.append("quality", String(job.quality));
		try {
			const res = await fetch("/api/convert", { method: "POST", body: form });
			if (!res.ok) throw new Error(await res.text());
			const blob = await res.blob();
			update(job.id, {
				status: "done",
				outUrl: URL.createObjectURL(blob),
				outName: replaceExt(job.file.name, job.target),
				outSize: blob.size,
			});
		} catch (e) {
			update(job.id, {
				status: "error",
				error: e instanceof Error ? e.message : "Conversion failed",
			});
			toast.error(`Failed to convert ${job.file.name}`);
		}
	};

	const convert = (id: string) => {
		const job = jobs.find((j) => j.id === id);
		if (job) void convertOne(job);
	};

	const convertAll = () => {
		for (const job of jobs.filter((j) => j.status === "ready")) {
			void convertOne(job);
		}
	};

	const pick = (pair: readonly [string, string]) => {
		preferred.current[pair[0]] = pair[1];
		setHint(pair);
		setJobs((prev) =>
			prev.map((j) =>
				j.ext === pair[0] && j.status !== "working"
					? {
							...j,
							target: pair[1],
							status: "ready",
							outUrl: undefined,
							outName: undefined,
							outSize: undefined,
							error: undefined,
						}
					: j,
			),
		);
		workbenchRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	const lastJob = jobs.at(-1);
	const override =
		hint ?? (lastJob?.ext ? ([lastJob.ext, lastJob.target] as const) : null);

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
					<FormatTicker override={override} />
				</div>
				<p className="mt-5 max-w-xl text-muted-foreground">
					Convert and compress images, video, audio, GIFs and archives. To
					shrink a file without changing its type, keep the same target and
					lower the quality.
				</p>
			</section>
			<section
				ref={workbenchRef}
				className="mx-auto w-full max-w-5xl scroll-mt-20 px-4"
			>
				<Dropzone onFiles={addFiles} />
				{jobs.length > 0 && (
					<Workbench
						jobs={jobs}
						onUpdate={update}
						onRemove={remove}
						onConvert={convert}
						onConvertAll={convertAll}
						onClear={clear}
					/>
				)}
			</section>
			<ToolDirectory onPick={pick} />
		</main>
	);
}
