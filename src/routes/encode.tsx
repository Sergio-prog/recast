import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useDebounced } from "@/hooks/use-debounced";
import {
	base64Decode,
	base64Encode,
	hexDecode,
	hexEncode,
	type ShaAlgorithm,
	sha,
	urlDecode,
	urlEncode,
} from "@/lib/encode";

export const Route = createFileRoute("/encode")({
	head: () => ({ meta: [{ title: "Encode & Hash — Recast" }] }),
	component: EncodePage,
});

type Codec = "base64" | "url" | "hex";
type Direction = "encode" | "decode";

const CODECS: Array<{ value: Codec; label: string }> = [
	{ value: "base64", label: "Base64" },
	{ value: "url", label: "URL" },
	{ value: "hex", label: "Hex" },
];

const DIRECTIONS: Array<{ value: Direction; label: string }> = [
	{ value: "encode", label: "Encode" },
	{ value: "decode", label: "Decode" },
];

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

function EncodePage() {
	const [text, setText] = useState(() =>
		typeof window === "undefined"
			? ""
			: (localStorage.getItem("recast:encode:text") ?? ""),
	);
	const [codec, setCodec] = useState<Codec>(() => {
		if (typeof window === "undefined") return "base64";
		const saved = localStorage.getItem("recast:encode:codec");
		return CODECS.some((c) => c.value === saved) ? (saved as Codec) : "base64";
	});
	const [direction, setDirection] = useState<Direction>("encode");
	const [copied, setCopied] = useState(false);
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
		localStorage.setItem("recast:encode:codec", codec);
	}, [codec]);

	const { output, error } = useMemo(
		() => transform(codec, direction, debouncedText),
		[codec, direction, debouncedText],
	);

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
			<textarea
				className="mt-8 min-h-32 w-full resize-y rounded-lg border bg-card p-4 font-mono text-sm leading-relaxed shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
				value={text}
				onChange={(e) => setText(e.target.value)}
				placeholder="Paste or type text…"
				spellCheck={false}
				suppressHydrationWarning
				aria-label="Input text"
			/>
			<Card className="mt-4">
				<CardHeader>
					<CardTitle className="flex flex-wrap items-center justify-between gap-3 font-mono text-sm uppercase tracking-widest">
						Transform
						<div className="flex flex-wrap gap-2 normal-case tracking-normal">
							<ToggleGroup
								variant="outline"
								value={[codec]}
								onValueChange={(value) => {
									if (value[0]) setCodec(value[0] as Codec);
								}}
								aria-label="Codec"
							>
								{CODECS.map((c) => (
									<ToggleGroupItem key={c.value} value={c.value}>
										{c.label}
									</ToggleGroupItem>
								))}
							</ToggleGroup>
							<ToggleGroup
								variant="outline"
								value={[direction]}
								onValueChange={(value) => {
									if (value[0]) setDirection(value[0] as Direction);
								}}
								aria-label="Direction"
							>
								{DIRECTIONS.map((d) => (
									<ToggleGroupItem key={d.value} value={d.value}>
										{d.label}
									</ToggleGroupItem>
								))}
							</ToggleGroup>
						</div>
					</CardTitle>
				</CardHeader>
				<CardContent>
					{error ? (
						<p className="text-sm text-destructive">{error}</p>
					) : (
						<div className="relative">
							<pre className="min-h-16 w-full overflow-x-auto whitespace-pre-wrap break-all rounded-lg border bg-background p-3 pr-12 font-mono text-sm leading-relaxed">
								{output}
							</pre>
							<button
								type="button"
								className="absolute right-2 top-2 rounded-md border bg-card p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
								disabled={output === ""}
								onClick={() => {
									void navigator.clipboard.writeText(output);
									setCopied(true);
									setTimeout(() => setCopied(false), 1500);
								}}
								aria-label="Copy output"
							>
								{copied ? (
									<CheckIcon className="size-4" />
								) : (
									<CopyIcon className="size-4" />
								)}
							</button>
						</div>
					)}
				</CardContent>
			</Card>
			<Card className="mt-4">
				<CardHeader>
					<CardTitle className="font-mono text-sm uppercase tracking-widest">
						Hash
					</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					{SHA_ALGORITHMS.map((algo) => (
						<div key={algo} className="flex flex-col gap-1">
							<span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
								{algo}
							</span>
							<p className="break-all rounded-lg border bg-background p-3 font-mono text-sm leading-relaxed">
								{hashes[algo] || (
									<span className="text-muted-foreground">—</span>
								)}
							</p>
						</div>
					))}
				</CardContent>
			</Card>
		</main>
	);
}
