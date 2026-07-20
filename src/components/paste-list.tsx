import { TrashIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounced } from "@/hooks/use-debounced";

type PasteSummary = {
	id: string;
	name: string;
	tags: Array<string>;
	visibility: "unlisted" | "private";
	createdAt: number;
};

export function PasteList() {
	const [query, setQuery] = useState("");
	const [tag, setTag] = useState("");
	const [pastes, setPastes] = useState<Array<PasteSummary> | null>(null);
	const [reload, setReload] = useState(0);
	const requestSequence = useRef(0);
	const debouncedQuery = useDebounced(query, 300);
	const debouncedTag = useDebounced(tag, 300);

	useEffect(() => {
		void reload;
		const controller = new AbortController();
		const sequence = ++requestSequence.current;
		const params = new URLSearchParams();
		if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
		if (debouncedTag.trim()) params.set("tag", debouncedTag.trim());
		const search = params.size > 0 ? `?${params.toString()}` : "";

		fetch(`/api/paste${search}`, { signal: controller.signal })
			.then((response) => (response.ok ? response.json() : []))
			.then((nextPastes: Array<PasteSummary>) => {
				if (sequence === requestSequence.current) setPastes(nextPastes);
			})
			.catch((error: unknown) => {
				if (
					sequence === requestSequence.current &&
					!(error instanceof DOMException && error.name === "AbortError")
				) {
					setPastes([]);
				}
			});

		return () => controller.abort();
	}, [debouncedQuery, debouncedTag, reload]);

	const filtered = Boolean(debouncedQuery.trim() || debouncedTag.trim());

	return (
		<Card className="mt-6">
			<CardHeader>
				<CardTitle className="font-mono text-sm uppercase tracking-widest">
					Your pastes
				</CardTitle>
				<CardDescription>
					Only you can see this list. Unlisted pastes are readable by anyone
					with the link.
				</CardDescription>
				<div className="mt-2 flex flex-wrap gap-2">
					<Input
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Search name or description"
						aria-label="Search pastes"
						maxLength={100}
						className="min-w-48 flex-1"
					/>
					<Input
						value={tag}
						onChange={(event) => setTag(event.target.value)}
						placeholder="Exact tag"
						aria-label="Filter by exact tag"
						maxLength={24}
						className="w-36 font-mono"
					/>
					{tag.trim() ? (
						<Button variant="ghost" size="sm" onClick={() => setTag("")}>
							Clear tag
						</Button>
					) : null}
				</div>
			</CardHeader>
			<CardContent className="flex flex-col">
				{pastes === null
					? ["one", "two", "three"].map((key) => (
							<div
								key={key}
								className="flex items-center gap-3 border-b py-2.5 last:border-b-0"
							>
								<Skeleton className="h-4 w-full max-w-48" />
								<Skeleton className="ml-auto h-4 w-14" />
								<Skeleton className="h-4 w-20" />
							</div>
						))
					: null}
				{pastes?.length === 0 ? (
					<p className="py-3 text-sm text-muted-foreground">
						{filtered
							? "No pastes match these filters."
							: "You haven't created any pastes yet."}
					</p>
				) : null}
				{pastes?.map((paste) => (
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
						{paste.tags.slice(0, 3).map((pasteTag) => (
							<button
								key={pasteTag}
								type="button"
								onClick={() => setTag(pasteTag)}
								aria-label={`Filter by tag ${pasteTag}`}
							>
								<Badge variant="secondary" className="font-mono text-[10px]">
									{pasteTag}
								</Badge>
							</button>
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
								setReload((value) => value + 1);
							}}
						>
							<TrashIcon />
						</Button>
					</div>
				))}
			</CardContent>
		</Card>
	);
}
