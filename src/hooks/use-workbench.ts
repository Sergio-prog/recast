import { useRef, useState } from "react";
import { toast } from "sonner";
import type { Job } from "@/components/workbench";
import {
	type Category,
	defaultTargetFor,
	FORMATS,
	normalizeExt,
	replaceExt,
	targetsFor,
} from "@/lib/formats";

export function useWorkbench(allowed?: ReadonlyArray<Category>) {
	const [jobs, setJobs] = useState<Array<Job>>([]);
	const [hint, setHint] = useState<readonly [string, string] | null>(null);
	const preferred = useRef<Record<string, string>>({});

	const addFiles = (files: Array<File>) => {
		if (files.length === 0) return;
		setHint(null);
		setJobs((prev) => [
			...prev,
			...files.map((file): Job => {
				const ext = normalizeExt(file.name);
				const category = ext ? FORMATS[ext].category : null;
				const rejected =
					allowed && category ? !allowed.includes(category) : false;
				const supported = Boolean(ext) && !rejected;
				return {
					id: crypto.randomUUID(),
					file,
					ext,
					target: supported
						? (preferred.current[ext] ?? defaultTargetFor(ext))
						: "",
					quality: 82,
					status: supported ? "ready" : "unsupported",
					error: rejected
						? "Wrong file type for this page — use the main workbench"
						: undefined,
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
			const encoded = res.headers
				.get("content-disposition")
				?.match(/filename\*=UTF-8''([^;]+)/)?.[1];
			update(job.id, {
				status: "done",
				outUrl: URL.createObjectURL(blob),
				outName: encoded
					? decodeURIComponent(encoded)
					: replaceExt(job.file.name, job.target),
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
			prev.map((j) => {
				if (
					j.status === "working" ||
					j.status === "unsupported" ||
					j.target === pair[1] ||
					!targetsFor(j.ext).includes(pair[1])
				) {
					return j;
				}
				preferred.current[j.ext] = pair[1];
				return {
					...j,
					target: pair[1],
					status: "ready",
					outUrl: undefined,
					outName: undefined,
					outSize: undefined,
					error: undefined,
				};
			}),
		);
	};

	const lastJob = jobs.at(-1);
	const override =
		hint ??
		(lastJob?.ext && lastJob.target
			? ([lastJob.ext, lastJob.target] as const)
			: null);

	return {
		jobs,
		override,
		addFiles,
		update,
		remove,
		clear,
		convert,
		convertAll,
		pick,
	};
}
