import {
	ArrowRightIcon,
	DownloadSimpleIcon,
	XIcon,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { formatBytes, hasQualityKnob, targetsFor } from "@/lib/formats";

export type Job = {
	id: string;
	file: File;
	ext: string;
	target: string;
	quality: number;
	status: "ready" | "working" | "done" | "error" | "unsupported";
	outUrl?: string;
	outName?: string;
	outSize?: number;
	error?: string;
};

type WorkbenchProps = {
	jobs: Array<Job>;
	onUpdate: (id: string, patch: Partial<Job>) => void;
	onRemove: (id: string) => void;
	onConvert: (id: string) => void;
	onConvertAll: () => void;
	onClear: () => void;
};

export function Workbench({
	jobs,
	onUpdate,
	onRemove,
	onConvert,
	onConvertAll,
	onClear,
}: WorkbenchProps) {
	const readyCount = jobs.filter((j) => j.status === "ready").length;
	return (
		<Card className="mt-4 gap-0 overflow-hidden py-0">
			<div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2.5">
				<p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
					{jobs.length} file{jobs.length === 1 ? "" : "s"}
				</p>
				<div className="flex gap-2">
					<Button variant="ghost" size="sm" onClick={onClear}>
						Clear
					</Button>
					{readyCount > 1 && (
						<Button size="sm" onClick={onConvertAll}>
							Convert all
						</Button>
					)}
				</div>
			</div>
			<ul>
				{jobs.map((job) => (
					<JobRow
						key={job.id}
						job={job}
						onUpdate={onUpdate}
						onRemove={onRemove}
						onConvert={onConvert}
					/>
				))}
			</ul>
		</Card>
	);
}

function JobRow({
	job,
	onUpdate,
	onRemove,
	onConvert,
}: {
	job: Job;
	onUpdate: (id: string, patch: Partial<Job>) => void;
	onRemove: (id: string) => void;
	onConvert: (id: string) => void;
}) {
	const targets = targetsFor(job.ext);
	return (
		<li className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-3 last:border-b-0">
			<Badge variant="outline" className="font-mono uppercase">
				.{job.ext || "?"}
			</Badge>
			<div className="min-w-0 flex-1 basis-40">
				<p className="truncate text-sm font-medium">{job.file.name}</p>
				<p className="font-mono text-xs text-muted-foreground">
					{formatBytes(job.file.size)}
				</p>
			</div>
			{job.status === "unsupported" ? (
				<p className="text-xs text-destructive">Format not supported</p>
			) : (
				<>
					<ArrowRightIcon className="size-4 text-muted-foreground" />
					<Select
						value={job.target}
						onValueChange={(value) =>
							onUpdate(job.id, {
								target: value as string,
								status: "ready",
								outUrl: undefined,
								outName: undefined,
								outSize: undefined,
								error: undefined,
							})
						}
						items={targets.map((t) => ({
							value: t,
							label: `.${t.toUpperCase()}`,
						}))}
					>
						<SelectTrigger size="sm" className="font-mono">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{targets.map((t) => (
								<SelectItem key={t} value={t} className="font-mono">
									.{t.toUpperCase()}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{hasQualityKnob(job.target) && (
						<div
							className="w-40"
							title="Drag to trade quality for file size — lower quality means a smaller file"
						>
							<div className="flex items-baseline justify-between">
								<span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
									Quality
								</span>
								<span className="font-mono text-xs tabular-nums">
									{job.quality}%
								</span>
							</div>
							<Slider
								className="mt-1.5"
								aria-label="Quality"
								value={[job.quality]}
								min={10}
								max={100}
								step={1}
								onValueChange={(value) =>
									onUpdate(job.id, {
										quality: Array.isArray(value) ? value[0] : value,
									})
								}
							/>
							<div className="mt-1 flex justify-between text-[9px] leading-none text-muted-foreground">
								<span>smaller file</span>
								<span>best quality</span>
							</div>
						</div>
					)}
					{job.status === "working" ? (
						<Button size="sm" disabled>
							<Spinner />
							Converting
						</Button>
					) : job.status === "done" ? (
						<div className="flex items-center gap-2">
							<p className="font-mono text-xs text-muted-foreground">
								{formatBytes(job.outSize ?? 0)}
								{job.outSize && job.outSize < job.file.size ? (
									<span className="text-green-600">
										{" "}
										−{Math.round((1 - job.outSize / job.file.size) * 100)}%
									</span>
								) : null}
							</p>
							<Button
								size="sm"
								variant="outline"
								render={
									<a href={job.outUrl} download={job.outName}>
										<DownloadSimpleIcon />
										Save
									</a>
								}
							/>
						</div>
					) : (
						<Button size="sm" onClick={() => onConvert(job.id)}>
							Convert
						</Button>
					)}
					{job.status === "error" && (
						<p className="w-full text-xs text-destructive">{job.error}</p>
					)}
				</>
			)}
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label={`Remove ${job.file.name}`}
				onClick={() => onRemove(job.id)}
			>
				<XIcon />
			</Button>
		</li>
	);
}
