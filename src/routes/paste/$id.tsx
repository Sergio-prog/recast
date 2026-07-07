import {
	CheckIcon,
	CopyIcon,
	FileTextIcon,
	GoogleLogoIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { formatBytes } from "@/lib/formats";

export const Route = createFileRoute("/paste/$id")({
	head: () => ({ meta: [{ title: "Paste — Recast" }] }),
	component: PasteViewPage,
});

type PasteView = {
	id: string;
	name: string;
	description: string;
	tags: Array<string>;
	language: string;
	visibility: "unlisted" | "private";
	content: string;
	createdAt: number;
	expiresAt: number | null;
	mine: boolean;
};

function PasteViewPage() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const [paste, setPaste] = useState<PasteView | null>(null);
	const [error, setError] = useState<{ status: number; text: string } | null>(
		null,
	);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		let cancelled = false;
		fetch(`/api/paste/${id}`)
			.then(async (res) => {
				if (!res.ok) {
					if (!cancelled)
						setError({ status: res.status, text: await res.text() });
					return null;
				}
				return res.json();
			})
			.then((body) => {
				if (body && !cancelled) setPaste(body);
			})
			.catch(() => {
				if (!cancelled) setError({ status: 0, text: "Could not load paste" });
			});
		return () => {
			cancelled = true;
		};
	}, [id]);

	return (
		<main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-14">
			{error ? (
				<PasteError status={error.status} text={error.text} />
			) : paste ? (
				<>
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div className="min-w-0">
							<p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
								Paste
							</p>
							<h1 className="mt-2 truncate font-display text-3xl font-semibold tracking-tight">
								{paste.name}
							</h1>
							{paste.description && (
								<p className="mt-2 max-w-xl text-sm text-muted-foreground">
									{paste.description}
								</p>
							)}
						</div>
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => {
									void navigator.clipboard.writeText(paste.content);
									setCopied(true);
									setTimeout(() => setCopied(false), 1500);
								}}
							>
								{copied ? <CheckIcon /> : <CopyIcon />}
								Copy
							</Button>
							<Button
								variant="outline"
								size="sm"
								render={
									<a
										href={`/api/paste/${paste.id}?raw`}
										target="_blank"
										rel="noreferrer"
									>
										<FileTextIcon />
										Raw
									</a>
								}
							/>
							{paste.mine && (
								<Button
									variant="destructive"
									size="sm"
									onClick={async () => {
										await fetch(`/api/paste/${paste.id}`, { method: "DELETE" });
										toast.success("Paste deleted");
										void navigate({ to: "/paste" });
									}}
								>
									<TrashIcon />
									Delete
								</Button>
							)}
						</div>
					</div>
					<div className="mt-3 flex flex-wrap items-center gap-2">
						{paste.tags.map((tag) => (
							<Badge
								key={tag}
								variant="secondary"
								className="font-mono text-xs"
							>
								{tag}
							</Badge>
						))}
						<Badge variant="outline" className="font-mono text-xs uppercase">
							{paste.visibility === "private" ? "private" : "link only"}
						</Badge>
						<span className="font-mono text-xs text-muted-foreground">
							{paste.language} · {formatBytes(new Blob([paste.content]).size)} ·{" "}
							{new Date(paste.createdAt).toLocaleString()}
							{paste.expiresAt
								? ` · expires ${new Date(paste.expiresAt).toLocaleDateString()}`
								: ""}
						</span>
					</div>
					<Card className="mt-5 py-0">
						<CardContent className="overflow-x-auto p-0">
							<pre className="min-w-0 p-4 font-mono text-sm leading-relaxed">
								{paste.content}
							</pre>
						</CardContent>
					</Card>
					<p className="mt-4 text-xs text-muted-foreground">
						<Link to="/paste" className="underline-offset-4 hover:underline">
							Create your own paste →
						</Link>
					</p>
				</>
			) : (
				<>
					<p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
						Paste
					</p>
					<Skeleton className="mt-3 h-9 w-64 max-w-full" />
					<div className="mt-4 flex gap-2">
						<Skeleton className="h-5 w-16" />
						<Skeleton className="h-5 w-20" />
						<Skeleton className="h-5 w-40" />
					</div>
					<Skeleton className="mt-5 h-56 w-full rounded-xl" />
				</>
			)}
		</main>
	);
}

function PasteError({ status, text }: { status: number; text: string }) {
	return (
		<div className="pt-6">
			<h1 className="font-display text-3xl font-semibold tracking-tight">
				{status === 403 ? "This paste is private" : "Paste not found"}
			</h1>
			<p className="mt-3 max-w-md text-muted-foreground">
				{status === 403
					? "Only its owner can view it. Sign in with the owning Google account to continue."
					: text || "It may have expired or never existed."}
			</p>
			{status === 403 && (
				<Button
					className="mt-5"
					onClick={() =>
						authClient.signIn.social({
							provider: "google",
							callbackURL: location.pathname,
						})
					}
				>
					<GoogleLogoIcon weight="bold" />
					Sign in with Google
				</Button>
			)}
			<p className="mt-5 text-xs text-muted-foreground">
				<Link to="/paste" className="underline-offset-4 hover:underline">
					Go to the pastebin →
				</Link>
			</p>
		</div>
	);
}
