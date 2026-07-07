import {
	CheckCircleIcon,
	GlobeHemisphereWestIcon,
	MagnifyingGlassIcon,
	WarningCircleIcon,
} from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export const Route = createFileRoute("/dig")({
	head: () => ({ meta: [{ title: "DNS dig — Recast" }] }),
	component: DigPage,
});

const RECORD_TYPES = [
	"A",
	"AAAA",
	"MX",
	"TXT",
	"NS",
	"CNAME",
	"SOA",
	"CAA",
] as const;

type DigResponse = {
	domain: string;
	type: string;
	records: Array<{
		resolver: string;
		ip: string;
		ms: number;
		records: Array<string>;
		error?: string;
	}>;
	whois: {
		registrar: string | null;
		created: string | null;
		expires: string | null;
		updated: string | null;
		status: Array<string>;
		nameservers: Array<string>;
	} | null;
};

function parseRecord(record: string): { value: string; ttl: string | null } {
	const match = record.match(/^(.*?)\s+·\s+TTL (\d+s)$/);
	return match
		? { value: match[1], ttl: match[2] }
		: { value: record, ttl: null };
}

function DigPage() {
	const [domain, setDomain] = useState("");
	const [type, setType] = useState<(typeof RECORD_TYPES)[number]>("A");
	const [working, setWorking] = useState(false);
	const [result, setResult] = useState<DigResponse | null>(null);
	const [resolver, setResolver] = useState<string | null>(null);

	const lookup = async (nextType = type) => {
		if (!domain.trim()) return;
		setWorking(true);
		try {
			const query = new URLSearchParams({
				domain: domain.trim(),
				type: nextType,
				rdap: "1",
			});
			const res = await fetch(`/api/dig?${query}`);
			if (!res.ok) throw new Error(await res.text());
			setResult(await res.json());
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Lookup failed");
		} finally {
			setWorking(false);
		}
	};

	const answers = result?.records.filter((r) => !r.error) ?? [];
	const consistent =
		answers.length > 1 &&
		new Set(answers.map((r) => [...r.records].sort().join("\n"))).size === 1;
	const selected =
		result?.records.find((r) => r.resolver === resolver) ??
		answers[0] ??
		result?.records[0];

	return (
		<main className="mx-auto w-full max-w-4xl px-4 pb-20 pt-14">
			<p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
				DNS dig
			</p>
			<h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
				Records, resolved.
			</h1>
			<p className="mt-4 max-w-xl text-muted-foreground">
				Query any record type against four public resolvers at once — see
				propagation mismatches instantly, with a registrar summary on the side.
			</p>
			<form
				className="mt-8 flex gap-2"
				onSubmit={(e) => {
					e.preventDefault();
					void lookup();
				}}
			>
				<Input
					value={domain}
					onChange={(e) => setDomain(e.target.value)}
					placeholder="example.com"
					className="h-11 font-mono text-sm"
				/>
				<Button type="submit" size="lg" disabled={working || !domain.trim()}>
					{working ? <Spinner /> : <MagnifyingGlassIcon />}
					Dig
				</Button>
			</form>
			<div className="mt-3 flex flex-wrap gap-1.5">
				{RECORD_TYPES.map((t) => (
					<button
						key={t}
						type="button"
						onClick={() => {
							setType(t);
							if (result) void lookup(t);
						}}
						className={`rounded-md border px-2.5 py-1 font-mono text-xs transition-colors ${
							type === t
								? "border-primary bg-primary text-primary-foreground"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						{t}
					</button>
				))}
			</div>
			{result && (
				<>
					<div className="mt-8 flex items-center gap-2">
						<h2 className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
							{result.type} · {result.domain}
						</h2>
						{answers.length > 1 &&
							(consistent ? (
								<Badge variant="secondary" className="gap-1 text-xs">
									<CheckCircleIcon className="size-3.5" />
									resolvers agree
								</Badge>
							) : (
								<Badge
									variant="outline"
									className="gap-1 text-xs text-destructive"
								>
									<WarningCircleIcon className="size-3.5" />
									answers differ — still propagating?
								</Badge>
							))}
					</div>
					<div className="mt-3 flex flex-wrap gap-1.5">
						{result.records.map((r) => {
							const active = r.resolver === selected?.resolver;
							return (
								<button
									key={r.resolver}
									type="button"
									onClick={() => setResolver(r.resolver)}
									className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-xs transition-colors ${
										active
											? "border-primary bg-primary text-primary-foreground"
											: "text-muted-foreground hover:text-foreground"
									}`}
								>
									<span
										className={`size-1.5 rounded-full ${
											r.error
												? "bg-destructive"
												: active
													? "bg-primary-foreground/70"
													: "bg-green-500"
										}`}
									/>
									{r.resolver}
									<span
										className={
											active ? "text-primary-foreground/70" : "opacity-60"
										}
									>
										{r.error ? "error" : `${r.ms}ms`}
									</span>
								</button>
							);
						})}
					</div>
					{selected && (
						<Card className="mt-3 py-4">
							<CardHeader className="pb-0">
								<CardTitle className="flex items-baseline justify-between font-mono text-xs uppercase tracking-widest">
									{selected.resolver}
									<span className="text-muted-foreground">
										{selected.ip} · {selected.ms}ms
									</span>
								</CardTitle>
							</CardHeader>
							<CardContent>
								{selected.error ? (
									<p className="text-sm text-muted-foreground">
										{selected.error}
									</p>
								) : (
									<div className="overflow-x-auto">
										<table className="w-full">
											<thead>
												<tr className="border-b text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
													<th className="py-2 pr-4 font-medium">Type</th>
													<th className="w-full py-2 pr-4 font-medium">
														Value
													</th>
													<th className="py-2 text-right font-medium">TTL</th>
												</tr>
											</thead>
											<tbody>
												{selected.records.map((record) => {
													const { value, ttl } = parseRecord(record);
													return (
														<tr
															key={record}
															className="border-b last:border-b-0"
														>
															<td className="py-2 pr-4 font-mono text-xs text-muted-foreground">
																{result.type}
															</td>
															<td className="break-all py-2 pr-4 font-mono text-xs leading-relaxed">
																{value}
															</td>
															<td className="whitespace-nowrap py-2 text-right font-mono text-xs text-muted-foreground">
																{ttl ?? "—"}
															</td>
														</tr>
													);
												})}
											</tbody>
										</table>
									</div>
								)}
							</CardContent>
						</Card>
					)}
					{result.whois && (
						<Card className="mt-3 py-4">
							<CardHeader className="pb-0">
								<CardTitle className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest">
									<GlobeHemisphereWestIcon className="size-4" />
									Registration
								</CardTitle>
							</CardHeader>
							<CardContent className="grid gap-x-6 gap-y-1 font-mono text-xs sm:grid-cols-2">
								{result.whois.registrar && (
									<p>
										<span className="text-muted-foreground">registrar </span>
										{result.whois.registrar}
									</p>
								)}
								{result.whois.created && (
									<p>
										<span className="text-muted-foreground">created </span>
										{result.whois.created.slice(0, 10)}
									</p>
								)}
								{result.whois.expires && (
									<p>
										<span className="text-muted-foreground">expires </span>
										{result.whois.expires.slice(0, 10)}
									</p>
								)}
								{result.whois.updated && (
									<p>
										<span className="text-muted-foreground">updated </span>
										{result.whois.updated.slice(0, 10)}
									</p>
								)}
								{result.whois.nameservers.length > 0 && (
									<p className="sm:col-span-2">
										<span className="text-muted-foreground">nameservers </span>
										{result.whois.nameservers.join(" · ")}
									</p>
								)}
								{result.whois.status.length > 0 && (
									<p className="sm:col-span-2">
										<span className="text-muted-foreground">status </span>
										{result.whois.status.join(" · ")}
									</p>
								)}
							</CardContent>
						</Card>
					)}
				</>
			)}
		</main>
	);
}
