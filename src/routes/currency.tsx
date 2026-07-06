import { ArrowsLeftRightIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/currency")({
	head: () => ({ meta: [{ title: "Currency converter — ultra.convert" }] }),
	component: CurrencyPage,
});

type Rates = { base: string; updated: string; rates: Record<string, number> };

const FEATURED = ["USD", "EUR", "GBP", "UAH", "PLN", "JPY", "CHF", "CZK"];

const currencyNames = new Intl.DisplayNames(["en"], { type: "currency" });

function nameOf(code: string): string {
	try {
		return currencyNames.of(code) ?? code;
	} catch {
		return code;
	}
}

function CurrencyPage() {
	const [amount, setAmount] = useState("100");
	const [from, setFrom] = useState("USD");
	const [to, setTo] = useState("EUR");
	const [data, setData] = useState<Rates | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		setError(null);
		fetch(`/api/currency?base=${from}`)
			.then(async (res) => {
				if (!res.ok) throw new Error(await res.text());
				return res.json();
			})
			.then((body: Rates) => {
				if (!cancelled) setData(body);
			})
			.catch((e) => {
				if (!cancelled)
					setError(e instanceof Error ? e.message : "Rates unavailable");
			});
		return () => {
			cancelled = true;
		};
	}, [from]);

	const codes = useMemo(
		() => (data ? Object.keys(data.rates).sort() : [from, to]),
		[data, from, to],
	);
	const items = useMemo(
		() => codes.map((code) => ({ value: code, label: code })),
		[codes],
	);

	const parsed = Number(amount.replace(",", "."));
	const rate = data?.base === from ? data.rates[to] : undefined;
	const result =
		rate !== undefined && Number.isFinite(parsed) ? parsed * rate : null;

	const fmt = (value: number, digits = 2) =>
		new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(
			value,
		);

	const swap = () => {
		setFrom(to);
		setTo(from);
	};

	return (
		<main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-14">
			<p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
				Currency converter
			</p>
			<h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
				Money, converted.
			</h1>
			<Card className="mt-8">
				<CardContent className="flex flex-col gap-6">
					<div className="flex flex-wrap items-end gap-3">
						<div className="min-w-40 flex-1">
							<Label
								htmlFor="amount"
								className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
							>
								Amount
							</Label>
							<Input
								id="amount"
								inputMode="decimal"
								value={amount}
								onChange={(e) => setAmount(e.target.value)}
								className="mt-1.5 h-12 font-mono text-lg"
							/>
						</div>
						<div>
							<Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
								From
							</Label>
							<Select
								value={from}
								onValueChange={(v) => setFrom(v as string)}
								items={items}
							>
								<SelectTrigger className="mt-1.5 h-12 w-28 font-mono">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{codes.map((code) => (
										<SelectItem key={code} value={code} className="font-mono">
											{code}
											<span className="ml-2 font-sans text-xs text-muted-foreground">
												{nameOf(code)}
											</span>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<Button
							variant="outline"
							size="icon"
							className="h-12 w-12"
							onClick={swap}
							aria-label="Swap currencies"
						>
							<ArrowsLeftRightIcon />
						</Button>
						<div>
							<Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
								To
							</Label>
							<Select
								value={to}
								onValueChange={(v) => setTo(v as string)}
								items={items}
							>
								<SelectTrigger className="mt-1.5 h-12 w-28 font-mono">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{codes.map((code) => (
										<SelectItem key={code} value={code} className="font-mono">
											{code}
											<span className="ml-2 font-sans text-xs text-muted-foreground">
												{nameOf(code)}
											</span>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					{error ? (
						<p className="text-sm text-destructive">{error}</p>
					) : (
						<div>
							<p className="font-mono text-4xl font-medium tracking-tight sm:text-5xl">
								{result === null ? "—" : `${fmt(result)} ${to}`}
							</p>
							{rate !== undefined && (
								<p className="mt-2 font-mono text-xs text-muted-foreground">
									1 {from} = {fmt(rate, 4)} {to}
									{data ? ` · ${data.updated.slice(0, 16)}` : ""}
								</p>
							)}
						</div>
					)}
				</CardContent>
			</Card>
			{data && result !== null && (
				<div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
					{FEATURED.filter(
						(code) => code !== from && code !== to && data.rates[code],
					).map((code) => (
						<button
							key={code}
							type="button"
							onClick={() => setTo(code)}
							className="rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary"
						>
							<p className="font-mono text-xs text-muted-foreground">{code}</p>
							<p className="mt-1 truncate font-mono text-sm">
								{fmt(parsed * data.rates[code])}
							</p>
						</button>
					))}
				</div>
			)}
			<p className="mt-6 text-xs text-muted-foreground">
				Daily reference rates via open.er-api.com — not for trading.
			</p>
		</main>
	);
}
