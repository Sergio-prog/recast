import {
	ArrowsLeftRightIcon,
	CheckIcon,
	CopyIcon,
} from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebounced } from "@/hooks/use-debounced";
import {
	base64Decode,
	base64Encode,
	byteLength,
	hexDecode,
	hexEncode,
	type ShaAlgorithm,
	sha,
	urlDecode,
	urlEncode,
} from "@/lib/encode";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/encode")({
	head: () => ({ meta: [{ title: "Encode & Hash — Recast" }] }),
	component: EncodePage,
});

type Codec = "base64" | "url" | "hex";
type Direction = "encode" | "decode";
type Mode = Codec | "sha";

const MODES: Array<{ value: Mode; label: string }> = [
	{ value: "base64", label: "Base64" },
	{ value: "url", label: "URL" },
	{ value: "hex", label: "Hex" },
	{ value: "sha", label: "SHA" },
];

const CODEC_LABEL: Record<Codec, string> = {
	base64: "Base64",
	url: "URL",
	hex: "Hex",
};

const CODEC_ERROR: Record<Codec, string> = {
	base64: "Not valid Base64",
	url: "Not valid URL-encoded text",
	hex: "Not valid hex",
};

const SHA_ALGORITHMS: Array<ShaAlgorithm> = [
	"SHA-1",
	"SHA-256",
	"SHA-384",
	"SHA-512",
];

const COPY_BUTTON_CLASSES =
	"rounded-md border bg-card p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50";

function transform(
	codec: Codec,
	direction: Direction,
	text: string,
): { output: string; error: string | null } {
	if (text === "") return { output: "", error: null };
	if (direction === "encode") {
		const output =
			codec === "base64"
				? base64Encode(text)
				: codec === "url"
					? urlEncode(text)
					: hexEncode(text);
		return { output, error: null };
	}
	const result =
		codec === "base64"
			? base64Decode(text)
			: codec === "url"
				? urlDecode(text)
				: hexDecode(text);
	return result.ok
		? { output: result.value, error: null }
		: { output: "", error: CODEC_ERROR[codec] };
}

function CopyButton({
	value,
	label,
	className,
}: {
	value: string;
	label: string;
	className?: string;
}) {
	const [copied, setCopied] = useState(false);
	return (
		<button
			type="button"
			className={cn(COPY_BUTTON_CLASSES, className)}
			disabled={value === ""}
			onClick={() => {
				void navigator.clipboard.writeText(value);
				setCopied(true);
				setTimeout(() => setCopied(false), 1500);
			}}
			aria-label={label}
		>
			{copied ? (
				<CheckIcon className="size-4" />
			) : (
				<CopyIcon className="size-4" />
			)}
		</button>
	);
}

function EncodePage() {
	const [text, setText] = useState(() =>
		typeof window === "undefined"
			? ""
			: (localStorage.getItem("recast:encode:text") ?? ""),
	);
	const [mode, setMode] = useState<Mode>(() => {
		if (typeof window === "undefined") return "base64";
		const saved = localStorage.getItem("recast:encode:codec");
		return MODES.some((m) => m.value === saved) ? (saved as Mode) : "base64";
	});
	const [direction, setDirection] = useState<Direction>("encode");
	const [hashes, setHashes] = useState<Record<ShaAlgorithm, string>>(
		() =>
			Object.fromEntries(SHA_ALGORITHMS.map((algo) => [algo, ""])) as Record<
				ShaAlgorithm,
				string
			>,
	);

	const debouncedText = useDebounced(text, 120);

	useEffect(() => {
		localStorage.setItem("recast:encode:text", debouncedText);
	}, [debouncedText]);

	useEffect(() => {
		localStorage.setItem("recast:encode:codec", mode);
	}, [mode]);

	useEffect(() => {
		if (debouncedText === "") {
			setHashes(
				Object.fromEntries(SHA_ALGORITHMS.map((algo) => [algo, ""])) as Record<
					ShaAlgorithm,
					string
				>,
			);
			return;
		}
		let cancelled = false;
		Promise.all(SHA_ALGORITHMS.map((algo) => sha(algo, debouncedText))).then(
			(digests) => {
				if (cancelled) return;
				setHashes(
					Object.fromEntries(
						SHA_ALGORITHMS.map((algo, i) => [algo, digests[i]]),
					) as Record<ShaAlgorithm, string>,
				);
			},
		);
		return () => {
			cancelled = true;
		};
	}, [debouncedText]);

	return (
		<main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-14">
			<p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
				Encode &amp; hash
			</p>
			<h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
				Base64, URL, hex — and hashes.
			</h1>
			<p className="mt-4 max-w-xl text-muted-foreground">
				Paste text, transform or hash it. Everything runs in your browser —
				nothing is sent anywhere.
			</p>
			<Tabs
				value={mode}
				onValueChange={(value) => setMode(value as Mode)}
				className="mt-8"
			>
				<TabsList className="w-full sm:w-fit">
					{MODES.map((m) => (
						<TabsTrigger key={m.value} value={m.value} className="px-4">
							{m.label}
						</TabsTrigger>
					))}
				</TabsList>
				<TabsContent value="base64">
					<TransformPanel
						codec="base64"
						direction={direction}
						text={text}
						debouncedText={debouncedText}
						onTextChange={setText}
						onSwapDirection={() =>
							setDirection((d) => (d === "encode" ? "decode" : "encode"))
						}
					/>
				</TabsContent>
				<TabsContent value="url">
					<TransformPanel
						codec="url"
						direction={direction}
						text={text}
						debouncedText={debouncedText}
						onTextChange={setText}
						onSwapDirection={() =>
							setDirection((d) => (d === "encode" ? "decode" : "encode"))
						}
					/>
				</TabsContent>
				<TabsContent value="hex">
					<TransformPanel
						codec="hex"
						direction={direction}
						text={text}
						debouncedText={debouncedText}
						onTextChange={setText}
						onSwapDirection={() =>
							setDirection((d) => (d === "encode" ? "decode" : "encode"))
						}
					/>
				</TabsContent>
				<TabsContent value="sha">
					<Card className="mt-2">
						<CardContent className="flex flex-col gap-4">
							<textarea
								className="min-h-32 w-full resize-y rounded-lg border bg-card p-4 font-mono text-sm leading-relaxed shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
								value={text}
								onChange={(e) => setText(e.target.value)}
								placeholder="Paste or type text…"
								spellCheck={false}
								suppressHydrationWarning
								aria-label="Text"
							/>
							{SHA_ALGORITHMS.map((algo) => (
								<div key={algo} className="flex flex-col gap-1">
									<span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
										{algo}
									</span>
									<div className="relative">
										<p className="break-all rounded-lg border bg-background p-3 pr-12 font-mono text-sm leading-relaxed">
											{hashes[algo] || (
												<span className="text-muted-foreground">—</span>
											)}
										</p>
										<CopyButton
											value={hashes[algo]}
											label={`Copy ${algo}`}
											className="absolute right-2 top-2"
										/>
									</div>
								</div>
							))}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</main>
	);
}

function TransformPanel({
	codec,
	direction,
	text,
	debouncedText,
	onTextChange,
	onSwapDirection,
}: {
	codec: Codec;
	direction: Direction;
	text: string;
	debouncedText: string;
	onTextChange: (value: string) => void;
	onSwapDirection: () => void;
}) {
	const { output, error } = useMemo(
		() => transform(codec, direction, debouncedText),
		[codec, direction, debouncedText],
	);

	const sourceLabel = direction === "encode" ? "Text" : CODEC_LABEL[codec];
	const targetLabel = direction === "encode" ? CODEC_LABEL[codec] : "Text";
	const sourceBytes = byteLength(debouncedText);
	const resultBytes = error ? null : byteLength(output);
	const delta =
		resultBytes !== null && sourceBytes > 0 && resultBytes > 0
			? Math.round((resultBytes / sourceBytes - 1) * 100)
			: null;

	return (
		<Card className="mt-2">
			<CardContent className="flex flex-col gap-3">
				<div className="flex items-center justify-between gap-3">
					<span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
						{sourceLabel}
					</span>
					<button
						type="button"
						onClick={onSwapDirection}
						aria-label={`Swap to ${direction === "encode" ? "decode" : "encode"}`}
						className={COPY_BUTTON_CLASSES}
					>
						<ArrowsLeftRightIcon className="size-4" />
					</button>
					<span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
						{targetLabel}
					</span>
				</div>
				<div className="grid gap-3 sm:grid-cols-2">
					<div>
						<textarea
							className="min-h-32 w-full resize-y rounded-lg border bg-card p-4 font-mono text-sm leading-relaxed shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
							value={text}
							onChange={(e) => onTextChange(e.target.value)}
							placeholder="Paste or type text…"
							spellCheck={false}
							suppressHydrationWarning
							aria-label={sourceLabel}
						/>
						<p className="mt-2 font-mono text-xs text-muted-foreground">
							{sourceBytes} bytes
						</p>
					</div>
					<div>
						<div className="relative">
							<pre
								className={cn(
									"min-h-32 w-full overflow-x-auto whitespace-pre-wrap break-all rounded-lg border bg-background p-3 pr-12 font-mono text-sm leading-relaxed",
									error && "text-destructive",
								)}
							>
								{error ?? output}
							</pre>
							<CopyButton
								value={output}
								label="Copy output"
								className="absolute right-2 top-2"
							/>
						</div>
						<p className="mt-2 font-mono text-xs text-muted-foreground">
							{resultBytes !== null &&
								`${resultBytes} bytes${delta !== null ? ` (${delta > 0 ? "+" : ""}${delta}%)` : ""}`}
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
