import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDebounced } from "@/hooks/use-debounced";
import { loadModel, MODELS } from "@/lib/tokenizers/registry";
import type {
	EncodeResult,
	LoadedTokenizer,
	ModelSpec,
} from "@/lib/tokenizers/types";

export const Route = createFileRoute("/tokenizer")({
	head: () => ({ meta: [{ title: "Tokenizer — Recast" }] }),
	component: TokenizerPage,
});

type ModelStatus = "idle" | "loading" | "ready" | "error";

const MAX_RENDERED = 50_000;
const HUE_CLASSES = [
	"bg-tk0",
	"bg-tk1",
	"bg-tk2",
	"bg-tk3",
	"bg-tk4",
	"bg-tk5",
];
const utf8 = new TextEncoder();
const format = (n: number) => n.toLocaleString("en-US");

function TokenizerPage() {
	const [text, setText] = useState(() =>
		typeof window === "undefined"
			? ""
			: (localStorage.getItem("recast:tokenizer:text") ?? ""),
	);
	const [selectedId, setSelectedId] = useState(() => {
		if (typeof window === "undefined") return MODELS[0].id;
		const saved = localStorage.getItem("recast:tokenizer:model");
		return MODELS.some((m) => m.id === saved) ? (saved as string) : MODELS[0].id;
	});
	const [states, setStates] = useState<Record<string, ModelStatus>>(() =>
		Object.fromEntries(MODELS.map((m) => [m.id, "idle"])),
	);
	const [result, setResult] = useState<EncodeResult | null>(null);
	const [mode, setMode] = useState<"text" | "ids">("text");
	const tokenizers = useRef<Record<string, LoadedTokenizer>>({});

	const debouncedText = useDebounced(text, 120);
	const selected = MODELS.find((m) => m.id === selectedId) ?? MODELS[0];
	const status = states[selected.id];

	const startLoad = useCallback((spec: ModelSpec) => {
		setStates((prev) =>
			prev[spec.id] === "loading" || prev[spec.id] === "ready"
				? prev
				: { ...prev, [spec.id]: "loading" },
		);
		loadModel(spec)
			.then((tok) => {
				tokenizers.current[spec.id] = tok;
				setStates((prev) => ({ ...prev, [spec.id]: "ready" }));
			})
			.catch(() => {
				setStates((prev) => ({ ...prev, [spec.id]: "error" }));
			});
	}, []);

	useEffect(() => {
		localStorage.setItem("recast:tokenizer:model", selected.id);
		startLoad(selected);
	}, [selected, startLoad]);

	useEffect(() => {
		localStorage.setItem("recast:tokenizer:text", debouncedText);
		const tok = tokenizers.current[selected.id];
		if (tok && states[selected.id] === "ready") {
			setResult(tok.encode(debouncedText));
		} else {
			setResult(null);
		}
	}, [debouncedText, states, selected]);

	const stats = useMemo(() => {
		const chars = [...debouncedText].length;
		const words = debouncedText.trim()
			? debouncedText.trim().split(/\s+/).length
			: 0;
		const bytes = utf8.encode(debouncedText).length;
		return { chars, words, bytes };
	}, [debouncedText]);

	return (
		<main className="mx-auto w-full max-w-4xl px-4 pb-20 pt-14">
			<p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
				Tokenizer
			</p>
			<h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
				Tokens, counted.
			</h1>
			<p className="mt-4 max-w-xl text-muted-foreground">
				Paste text, pick a model, read the count — and see exactly how the text
				splits into tokens. Everything runs in your browser; each vocabulary
				downloads once and stays cached.
			</p>
			<textarea
				className="mt-8 min-h-56 w-full resize-y rounded-lg border bg-card p-4 font-mono text-sm leading-relaxed shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
				value={text}
				onChange={(e) => setText(e.target.value)}
				placeholder="Paste or type text to count…"
				spellCheck={false}
				suppressHydrationWarning
				aria-label="Text to tokenize"
			/>
			<div
				className="mt-3 flex flex-wrap gap-1.5"
				role="group"
				aria-label="Model"
			>
				{MODELS.map((spec) => {
					const active = spec.id === selected.id;
					return (
						<button
							key={spec.id}
							type="button"
							aria-pressed={active}
							title={`${spec.note} · ${spec.sizeLabel} download on first use`}
							onClick={() => setSelectedId(spec.id)}
							className={`flex flex-col items-start rounded-md border px-2.5 py-1.5 text-left transition-colors ${
								active
									? "border-primary bg-primary text-primary-foreground"
									: states[spec.id] === "error"
										? "border-destructive/50 text-muted-foreground hover:text-foreground"
										: "text-muted-foreground hover:text-foreground"
							}`}
						>
							<span
								className={`font-mono text-[9px] uppercase tracking-widest ${
									active ? "text-primary-foreground/70" : "opacity-70"
								}`}
							>
								{spec.vendor}
							</span>
							<span className="text-xs font-medium">
								{spec.label}
								{spec.fidelity === "estimate" && (
									<sup className="ml-0.5 text-[10px]">≈</sup>
								)}
							</span>
						</button>
					);
				})}
			</div>
			<Card className="mt-4 py-4" aria-live="polite">
				<CardContent className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
					<div className="flex min-h-10 items-baseline gap-2.5">
						{status === "ready" && result !== null && (
							<>
								<span className="font-display text-4xl font-semibold tabular-nums tracking-tight">
									{format(result.count)}
								</span>
								<span className="font-mono text-sm text-muted-foreground">
									tokens
								</span>
								{selected.fidelity === "estimate" && (
									<Badge variant="secondary" title={selected.note}>
										≈ estimate
									</Badge>
								)}
							</>
						)}
						{status === "loading" && (
							<span className="animate-pulse self-center font-mono text-sm text-muted-foreground">
								loading {selected.label} vocabulary ({selected.sizeLabel})…
							</span>
						)}
						{status === "error" && (
							<span className="flex items-center gap-2 self-center text-sm text-destructive">
								Vocabulary failed to load
								<Button
									size="sm"
									variant="outline"
									onClick={() => startLoad(selected)}
								>
									Retry
								</Button>
							</span>
						)}
					</div>
					<p className="font-mono text-xs tabular-nums text-muted-foreground">
						{format(stats.chars)} chars · {format(stats.words)} words ·{" "}
						{format(stats.bytes)} bytes
						{result !== null && result.count > 0 && (
							<> · {(stats.chars / result.count).toFixed(2)} chars/token</>
						)}
					</p>
				</CardContent>
			</Card>
			{status === "ready" && result !== null && result.count > 0 && (
				<Card className="mt-3 gap-3 py-4">
					<CardHeader className="pb-0">
						<CardTitle className="flex items-center justify-between font-mono text-xs uppercase tracking-widest">
							Segmentation
							<span className="flex overflow-hidden rounded-md border normal-case tracking-normal">
								{(["text", "ids"] as const).map((m) => (
									<button
										key={m}
										type="button"
										onClick={() => setMode(m)}
										className={`px-3 py-1 font-mono text-xs transition-colors ${
											mode === m
												? "bg-primary text-primary-foreground"
												: "text-muted-foreground hover:text-foreground"
										}`}
									>
										{m === "text" ? "Text" : "IDs"}
									</button>
								))}
							</span>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words font-mono text-sm leading-[1.8]">
							{result.pieces.slice(0, MAX_RENDERED).map((piece, i) => (
								<span
									// biome-ignore lint/suspicious/noArrayIndexKey: tokens are position-identified and the list is replaced wholesale on each encode
									key={`${i}-${piece.id}`}
									title={`id ${piece.id}`}
									className={`py-0.5 ${HUE_CLASSES[i % HUE_CLASSES.length]} ${
										mode === "ids"
											? "mx-[3px] my-0.5 inline-block rounded px-1.5 text-xs"
											: ""
									}`}
								>
									{mode === "text" ? piece.text : piece.id}
								</span>
							))}
						</div>
						<p className="mt-3 text-xs text-muted-foreground">
							Each shaded span is one token. � marks a token holding part of a
							multi-byte character.
						</p>
					</CardContent>
				</Card>
			)}
		</main>
	);
}
