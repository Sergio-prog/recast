import { CheckCircleIcon, GaugeIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Speedometer } from "@/components/speedometer";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { measureDownload, measureUpload } from "@/lib/speed-test";

export const Route = createFileRoute("/speed")({
	head: () => ({ meta: [{ title: "Speed test — Recast" }] }),
	component: SpeedPage,
});

type Phase = "idle" | "ping" | "download" | "upload" | "done";

type Results = {
	pingMs: number | null;
	jitterMs: number | null;
	downMbps: number | null;
	upMbps: number | null;
};

const EMPTY: Results = {
	pingMs: null,
	jitterMs: null,
	downMbps: null,
	upMbps: null,
};

function SpeedPage() {
	const [phase, setPhase] = useState<Phase>("idle");
	const [results, setResults] = useState<Results>(EMPTY);
	const [liveMbps, setLiveMbps] = useState(0);

	const run = async () => {
		setResults(EMPTY);
		setLiveMbps(0);
		try {
			setPhase("ping");
			const samples: Array<number> = [];
			for (let i = 0; i < 8; i++) {
				const started = performance.now();
				await fetch("/api/speed?op=ping");
				samples.push(performance.now() - started);
			}
			const timed = samples.slice(2);
			const pingMs = Math.min(...timed);
			const jitterMs =
				timed.slice(1).reduce((sum, v, i) => sum + Math.abs(v - timed[i]), 0) /
				(timed.length - 1);
			setResults((r) => ({
				...r,
				pingMs: Math.round(pingMs * 10) / 10,
				jitterMs: Math.round(jitterMs * 10) / 10,
			}));

			setPhase("download");
			const downMbps = await measureDownload(setLiveMbps);
			setResults((r) => ({
				...r,
				downMbps: Math.round(downMbps * 10) / 10,
			}));

			setPhase("upload");
			setLiveMbps(0);
			const upMbps = await measureUpload(setLiveMbps);
			setResults((r) => ({
				...r,
				upMbps: Math.round(upMbps * 10) / 10,
			}));
			setLiveMbps(0);
			setPhase("done");
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Speed test failed");
			setPhase("idle");
		}
	};

	const running = phase !== "idle" && phase !== "done";
	const gaugeValue =
		phase === "download" || phase === "upload"
			? liveMbps
			: phase === "done"
				? (results.downMbps ?? 0)
				: 0;
	const gaugeLabel =
		phase === "done"
			? "Download result"
			: phase === "upload"
				? "Upload"
				: phase === "ping"
					? "Measuring latency"
					: "Download";

	return (
		<main className="mx-auto w-full max-w-4xl px-4 pb-20 pt-14">
			<p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
				Speed test
			</p>
			<h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
				Bits per second.
			</h1>
			<p className="mt-4 max-w-xl text-muted-foreground">
				Measures the real link between this browser and your Recast server —
				ping, download and upload. Self-hosted, so no third-party test servers
				involved.
			</p>
			<section className="mt-8 border-y py-8 sm:py-10">
				<Speedometer
					value={gaugeValue}
					label={gaugeLabel}
					active={phase === "download" || phase === "upload"}
				/>
				<div className="mx-auto mt-8 flex max-w-2xl flex-col gap-8">
					<div className="grid grid-cols-3 gap-4">
						<Stat
							label="ping"
							value={results.pingMs}
							unit="ms"
							active={phase === "ping"}
							sub={
								results.jitterMs !== null
									? `±${results.jitterMs} jitter`
									: undefined
							}
						/>
						<Stat
							label="download"
							value={results.downMbps}
							unit="Mbps"
							active={phase === "download"}
						/>
						<Stat
							label="upload"
							value={results.upMbps}
							unit="Mbps"
							active={phase === "upload"}
						/>
					</div>
					<div className="text-center">
						{phase === "done" ? (
							<p
								className="mb-4 inline-flex items-center gap-2 font-mono text-sm text-foreground"
								aria-live="polite"
							>
								<CheckCircleIcon
									className="size-5 text-green-600 dark:text-green-400"
									weight="fill"
								/>
								Test complete. Results are ready.
							</p>
						) : null}
						<div>
							<Button size="lg" disabled={running} onClick={() => void run()}>
								{running ? <Spinner /> : <GaugeIcon />}
								{phase === "done"
									? "Run again"
									: running
										? "Testing…"
										: "Run test"}
							</Button>
						</div>
					</div>
				</div>
			</section>
		</main>
	);
}

function Stat({
	label,
	value,
	unit,
	active,
	sub,
}: {
	label: string;
	value: number | null;
	unit: string;
	active: boolean;
	sub?: string;
}) {
	return (
		<div>
			<p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
				{label}
			</p>
			<p
				className={`mt-1 font-mono text-3xl font-medium tracking-tight sm:text-4xl ${
					active ? "animate-pulse text-muted-foreground" : ""
				}`}
			>
				{value === null ? (active ? "…" : "—") : value}
				<span className="ml-1 text-sm text-muted-foreground">{unit}</span>
			</p>
			{sub && (
				<p className="mt-0.5 font-mono text-xs text-muted-foreground">{sub}</p>
			)}
		</div>
	);
}
