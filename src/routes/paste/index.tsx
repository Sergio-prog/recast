import {
	GoogleLogoIcon,
	LinkIcon,
	LockSimpleIcon,
	SignOutIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/paste/")({
	head: () => ({ meta: [{ title: "Paste — Recast" }] }),
	component: PastePage,
});

const LANGUAGES = [
	"text",
	"typescript",
	"javascript",
	"python",
	"json",
	"html",
	"css",
	"sql",
	"bash",
	"rust",
	"go",
	"yaml",
];

const EXPIRIES = [
	{ value: "1h", label: "1 hour" },
	{ value: "1d", label: "1 day" },
	{ value: "7d", label: "1 week" },
	{ value: "30d", label: "30 days" },
	{ value: "never", label: "Never" },
];

type PasteSummary = {
	id: string;
	name: string;
	tags: Array<string>;
	visibility: "unlisted" | "private";
	createdAt: number;
	expiresAt: number | null;
};

function PastePage() {
	const { data: session, isPending } = authClient.useSession();
	return (
		<main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-14">
			<p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
				Pastebin
			</p>
			<h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
				Text, shared.
			</h1>
			<p className="mt-4 max-w-xl text-muted-foreground">
				Create link-only or private pastes with tags and expiry. Sign in with
				Google to start — pastes are never listed publicly.
			</p>
			{isPending ? (
				<div className="mt-10 flex justify-center">
					<Spinner className="size-6" />
				</div>
			) : session?.user ? (
				<SignedIn name={session.user.name} />
			) : (
				<SignedOut />
			)}
		</main>
	);
}

function SignedOut() {
	const [busy, setBusy] = useState(false);
	return (
		<Card className="mt-8">
			<CardContent className="flex flex-col items-start gap-4 py-2">
				<p className="text-sm text-muted-foreground">
					Only authorized users can create pastes.
				</p>
				<Button
					disabled={busy}
					onClick={async () => {
						setBusy(true);
						try {
							await authClient.signIn.social({
								provider: "google",
								callbackURL: "/paste",
							});
						} catch {
							toast.error(
								"Google sign-in is not configured — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET",
							);
							setBusy(false);
						}
					}}
				>
					{busy ? <Spinner /> : <GoogleLogoIcon weight="bold" />}
					Sign in with Google
				</Button>
			</CardContent>
		</Card>
	);
}

function SignedIn({ name }: { name: string }) {
	const navigate = useNavigate();
	const [pasteName, setPasteName] = useState("");
	const [description, setDescription] = useState("");
	const [tags, setTags] = useState("");
	const [language, setLanguage] = useState("text");
	const [visibility, setVisibility] = useState<"unlisted" | "private">(
		"unlisted",
	);
	const [expiry, setExpiry] = useState("7d");
	const [content, setContent] = useState("");
	const [busy, setBusy] = useState(false);
	const [mine, setMine] = useState<Array<PasteSummary> | null>(null);

	const loadMine = () => {
		fetch("/api/paste")
			.then((res) => (res.ok ? res.json() : []))
			.then(setMine)
			.catch(() => setMine([]));
	};
	useEffect(loadMine, []);

	const create = async () => {
		setBusy(true);
		try {
			const res = await fetch("/api/paste", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					name: pasteName,
					description,
					tags: tags
						.split(",")
						.map((t) => t.trim())
						.filter(Boolean),
					language,
					visibility,
					expiry,
					content,
				}),
			});
			if (!res.ok) throw new Error(await res.text());
			const { id } = await res.json();
			void navigate({ to: "/paste/$id", params: { id } });
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Could not create paste");
			setBusy(false);
		}
	};

	return (
		<>
			<div className="mt-6 flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					Signed in as{" "}
					<span className="font-medium text-foreground">{name}</span>
				</p>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => authClient.signOut().then(() => location.reload())}
				>
					<SignOutIcon />
					Sign out
				</Button>
			</div>
			<Card className="mt-4">
				<CardContent className="flex flex-col gap-4">
					<div className="grid gap-4 sm:grid-cols-2">
						<div>
							<Label htmlFor="paste-name" className="text-xs">
								Name
							</Label>
							<Input
								id="paste-name"
								value={pasteName}
								onChange={(e) => setPasteName(e.target.value)}
								placeholder="deploy script"
								className="mt-1.5"
							/>
						</div>
						<div>
							<Label htmlFor="paste-tags" className="text-xs">
								Tags (comma separated)
							</Label>
							<Input
								id="paste-tags"
								value={tags}
								onChange={(e) => setTags(e.target.value)}
								placeholder="infra, bash"
								className="mt-1.5"
							/>
						</div>
					</div>
					<div>
						<Label htmlFor="paste-description" className="text-xs">
							Description
						</Label>
						<Input
							id="paste-description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="What is this paste about?"
							className="mt-1.5"
						/>
					</div>
					<div className="flex flex-wrap items-end gap-3">
						<div>
							<Label className="text-xs">Language</Label>
							<Select
								value={language}
								onValueChange={(v) => setLanguage(v as string)}
								items={LANGUAGES.map((l) => ({ value: l, label: l }))}
							>
								<SelectTrigger size="sm" className="mt-1.5 w-32 font-mono">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{LANGUAGES.map((l) => (
										<SelectItem key={l} value={l} className="font-mono">
											{l}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label className="text-xs">Expires</Label>
							<Select
								value={expiry}
								onValueChange={(v) => setExpiry(v as string)}
								items={EXPIRIES}
							>
								<SelectTrigger size="sm" className="mt-1.5 w-28">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{EXPIRIES.map((e) => (
										<SelectItem key={e.value} value={e.value}>
											{e.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex rounded-md border p-0.5">
							{(["unlisted", "private"] as const).map((v) => (
								<button
									key={v}
									type="button"
									onClick={() => setVisibility(v)}
									className={`flex items-center gap-1 rounded px-3 py-1 font-mono text-xs uppercase transition-colors ${
										visibility === v
											? "bg-primary text-primary-foreground"
											: "text-muted-foreground hover:text-foreground"
									}`}
								>
									{v === "unlisted" ? <LinkIcon /> : <LockSimpleIcon />}
									{v === "unlisted" ? "Link only" : "Private"}
								</button>
							))}
						</div>
					</div>
					<div>
						<Label htmlFor="paste-content" className="text-xs">
							Content
						</Label>
						<textarea
							id="paste-content"
							value={content}
							onChange={(e) => setContent(e.target.value)}
							rows={12}
							spellCheck={false}
							className="mt-1.5 w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
						/>
					</div>
					<div>
						<Button
							disabled={busy || !content.trim()}
							onClick={() => void create()}
						>
							{busy && <Spinner />}
							Create paste
						</Button>
					</div>
				</CardContent>
			</Card>
			{(mine === null || mine.length > 0) && (
				<Card className="mt-6">
					<CardHeader>
						<CardTitle className="font-mono text-sm uppercase tracking-widest">
							Your pastes
						</CardTitle>
						<CardDescription>
							Only you can see this list. Unlisted pastes are readable by anyone
							with the link.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col">
						{mine === null &&
							["one", "two", "three"].map((key) => (
								<div
									key={key}
									className="flex items-center gap-3 border-b py-2.5 last:border-b-0"
								>
									<Skeleton className="h-4 w-full max-w-48" />
									<Skeleton className="ml-auto h-4 w-14" />
									<Skeleton className="h-4 w-20" />
								</div>
							))}
						{(mine ?? []).map((paste) => (
							<div
								key={paste.id}
								className="flex items-center gap-3 border-b py-2 last:border-b-0"
							>
								<a
									href={`/paste/${paste.id}`}
									className="min-w-0 flex-1 truncate text-sm font-medium underline-offset-4 hover:underline"
								>
									{paste.name}
								</a>
								{paste.tags.slice(0, 3).map((tag) => (
									<Badge
										key={tag}
										variant="secondary"
										className="font-mono text-[10px]"
									>
										{tag}
									</Badge>
								))}
								<Badge
									variant="outline"
									className="font-mono text-[10px] uppercase"
								>
									{paste.visibility === "private" ? "private" : "link"}
								</Badge>
								<span className="font-mono text-xs text-muted-foreground">
									{new Date(paste.createdAt).toLocaleDateString()}
								</span>
								<Button
									variant="ghost"
									size="icon-xs"
									aria-label={`Delete ${paste.name}`}
									onClick={async () => {
										await fetch(`/api/paste/${paste.id}`, { method: "DELETE" });
										loadMine();
									}}
								>
									<TrashIcon />
								</Button>
							</div>
						))}
					</CardContent>
				</Card>
			)}
		</>
	);
}
