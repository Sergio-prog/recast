import { GaugeIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

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

const MB = 1024 * 1024;

function makePayload(bytes: number): Uint8Array<ArrayBuffer> {
	const chunk = new Uint8Array(65536);
	crypto.getRandomValues(chunk);
	const payload = new Uint8Array(bytes);
	for (let offset = 0; offset < bytes; offset += chunk.length) {
		payload.set(
			chunk.subarray(0, Math.min(chunk.length, bytes - offset)),
			offset,
		);
	}
	return payload;
}

async function timedDownload(bytes: number): Promise<number> {
	const started = performance.now();
	const res = await fetch(`/api/speed?bytes=${bytes}`);
	if (!res.ok || !res.body) throw new Error(await res.text());
	const reader = res.body.getReader();
	while (true) {
		const { done } = await reader.read();
		if (done) break;
	}
	return (performance.now() - started) / 1000;
}

async function timedUpload(bytes: number): Promise<number> {
	const payload = makePayload(bytes);
	const started = performance.now();
	const res = await fetch("/api/speed", { method: "POST", body: payload });
	if (!res.ok) throw new Error(await res.text());
	await res.json();
	return (performance.now() - started) / 1000;
}

function SpeedPage() {
	const [phase, setPhase] = useState<Phase>("idle");
	const [results, setResults] = useState<Results>(EMPTY);

	const run = async () => {
		setResults(EMPTY);
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
			await timedDownload(2 * MB);
			let downBytes = 16 * MB;
			let downSeconds = await timedDownload(downBytes);
			if (downSeconds < 1.2) {
				const extra = 64 * MB;
				downSeconds += await timedDownload(extra);
				downBytes += extra;
			}
			setResults((r) => ({
				...r,
				downMbps: Math.round(((downBytes * 8) / downSeconds / 1e6) * 10) / 10,
			}));

			setPhase("upload");
			await timedUpload(1 * MB);
			let upBytes = 8 * MB;
			let upSeconds = await timedUpload(upBytes);
			if (upSeconds < 1.2) {
				const extra = 32 * MB;
				upSeconds += await timedUpload(extra);
				upBytes += extra;
			}
			setResults((r) => ({
				...r,
				upMbps: Math.round(((upBytes * 8) / upSeconds / 1e6) * 10) / 10,
			}));
			setPhase("done");
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Speed test failed");
			setPhase("idle");
		}
	};

	const running = phase !== "idle" && phase !== "done";

	return (
		<main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-14">
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
			<Card className="mt-8">
				<CardContent className="flex flex-col gap-8 py-2">
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
				</CardContent>
			</Card>
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
