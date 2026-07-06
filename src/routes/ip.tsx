import { DesktopIcon, GlobeIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export const Route = createFileRoute("/ip")({
	head: () => ({ meta: [{ title: "My IP — Recast" }] }),
	component: IpPage,
});

type IpInfo = {
	ip: string;
	viaServer: boolean;
	reverse: Array<string>;
	geo: {
		country: string | null;
		city: string | null;
		region: string | null;
		isp: string | null;
		org: string | null;
		asn: number | null;
		timezone: string | null;
		flag: string | null;
	} | null;
};

type BrowserInfo = Array<readonly [string, string]>;

function IpPage() {
	const [info, setInfo] = useState<IpInfo | null>(null);
	const [failed, setFailed] = useState(false);
	const [browser, setBrowser] = useState<BrowserInfo>([]);

	useEffect(() => {
		fetch("/api/ip")
			.then((res) => (res.ok ? res.json() : Promise.reject()))
			.then(setInfo)
			.catch(() => setFailed(true));
		setBrowser([
			["user agent", navigator.userAgent],
			["languages", navigator.languages.join(", ")],
			["timezone", Intl.DateTimeFormat().resolvedOptions().timeZone],
			[
				"screen",
				`${window.screen.width}×${window.screen.height} @ ${window.devicePixelRatio}x`,
			],
			["cpu threads", String(navigator.hardwareConcurrency ?? "unknown")],
			["cookies", navigator.cookieEnabled ? "enabled" : "disabled"],
		]);
	}, []);

	return (
		<main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-14">
			<p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
				IP inspector
			</p>
			<h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
				You, from outside.
			</h1>
			<p className="mt-4 max-w-xl text-muted-foreground">
				What this server — and by extension any site you visit — can tell about
				your connection and browser.
			</p>
			<Card className="mt-8">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest">
						<GlobeIcon className="size-4" />
						Network
					</CardTitle>
				</CardHeader>
				<CardContent>
					{failed ? (
						<p className="text-sm text-destructive">
							Could not look up your address — the geo service may be
							unreachable.
						</p>
					) : !info ? (
						<Spinner className="size-5" />
					) : (
						<div className="flex flex-col gap-4">
							<p className="font-mono text-3xl font-medium tracking-tight sm:text-4xl">
								{info.ip}
								{info.geo?.flag && (
									<span className="ml-3">{info.geo.flag}</span>
								)}
							</p>
							{info.viaServer && (
								<p className="text-xs text-muted-foreground">
									You are on the same machine or network as the server, so this
									is the shared public egress address.
								</p>
							)}
							<dl className="grid gap-x-6 gap-y-1.5 font-mono text-xs sm:grid-cols-2">
								{info.geo?.country && (
									<Row
										label="location"
										value={[info.geo.city, info.geo.region, info.geo.country]
											.filter(Boolean)
											.join(", ")}
									/>
								)}
								{info.geo?.isp && <Row label="isp" value={info.geo.isp} />}
								{info.geo?.org && info.geo.org !== info.geo.isp && (
									<Row label="org" value={info.geo.org} />
								)}
								{info.geo?.asn && (
									<Row label="asn" value={`AS${info.geo.asn}`} />
								)}
								{info.geo?.timezone && (
									<Row label="timezone" value={info.geo.timezone} />
								)}
								{info.reverse.length > 0 && (
									<Row label="reverse dns" value={info.reverse.join(", ")} />
								)}
							</dl>
						</div>
					)}
				</CardContent>
			</Card>
			<Card className="mt-4">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest">
						<DesktopIcon className="size-4" />
						Browser
					</CardTitle>
				</CardHeader>
				<CardContent>
					<dl className="grid gap-x-6 gap-y-1.5 font-mono text-xs">
						{browser.map(([label, value]) => (
							<Row key={label} label={label} value={value} />
						))}
					</dl>
				</CardContent>
			</Card>
			<p className="mt-4 text-xs text-muted-foreground">
				Geo data via ipwho.is — nothing about you is stored.
			</p>
		</main>
	);
}

function Row({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex gap-2">
			<dt className="shrink-0 text-muted-foreground">{label}</dt>
			<dd className="break-all">{value}</dd>
		</div>
	);
}
