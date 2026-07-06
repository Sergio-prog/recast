import {
	ArrowDownIcon,
	ArrowUpIcon,
	DownloadSimpleIcon,
	FilePdfIcon,
	PlusIcon,
	XIcon,
} from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { formatBytes } from "@/lib/formats";

export const Route = createFileRoute("/pdf")({
	head: () => ({ meta: [{ title: "PDF tools — ultra.convert" }] }),
	component: PdfPage,
});

function PdfPage() {
	return (
		<main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-14">
			<p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
				PDF tools
			</p>
			<h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
				Pages, assembled.
			</h1>
			<p className="mt-4 max-w-xl text-muted-foreground">
				Merge PDFs, split them apart or bundle images into a single document.
				For single-file conversions like PDF → PNG or JPG → PDF, drop the file
				on the main workbench.
			</p>
			<div className="mt-8 grid gap-4 lg:grid-cols-3">
				<PdfTool
					op="merge"
					title="Merge PDFs"
					description="Combine two or more PDFs into one, in the order listed."
					accept=".pdf"
					multiple
					cta="Merge"
					minFiles={2}
				/>
				<PdfTool
					op="split"
					title="Split PDF"
					description="Every page as its own PDF (zipped), or extract a page range like 1-3,5."
					accept=".pdf"
					cta="Split"
					minFiles={1}
					withRange
				/>
				<PdfTool
					op="images"
					title="Images to PDF"
					description="Bundle JPG, PNG, WebP, HEIC and other images into one PDF, one page per image."
					accept="image/*,.heic,.heif"
					multiple
					cta="Create PDF"
					minFiles={1}
				/>
			</div>
		</main>
	);
}

type PdfToolProps = {
	op: "merge" | "split" | "images";
	title: string;
	description: string;
	accept: string;
	cta: string;
	minFiles: number;
	multiple?: boolean;
	withRange?: boolean;
};

function PdfTool({
	op,
	title,
	description,
	accept,
	cta,
	minFiles,
	multiple = false,
	withRange = false,
}: PdfToolProps) {
	const [files, setFiles] = useState<Array<{ id: string; file: File }>>([]);
	const [range, setRange] = useState("");
	const [working, setWorking] = useState(false);
	const [result, setResult] = useState<{ url: string; name: string } | null>(
		null,
	);
	const inputRef = useRef<HTMLInputElement>(null);

	const move = (index: number, delta: number) => {
		setFiles((prev) => {
			const next = [...prev];
			const target = index + delta;
			if (target < 0 || target >= next.length) return prev;
			[next[index], next[target]] = [next[target], next[index]];
			return next;
		});
	};

	const submit = async () => {
		setWorking(true);
		if (result) URL.revokeObjectURL(result.url);
		setResult(null);
		const form = new FormData();
		form.append("op", op);
		for (const entry of files) form.append("file", entry.file);
		if (withRange && range.trim()) form.append("range", range.trim());
		try {
			const res = await fetch("/api/pdf", { method: "POST", body: form });
			if (!res.ok) throw new Error(await res.text());
			const blob = await res.blob();
			const encoded = res.headers
				.get("content-disposition")
				?.match(/filename\*=UTF-8''([^;]+)/)?.[1];
			setResult({
				url: URL.createObjectURL(blob),
				name: encoded ? decodeURIComponent(encoded) : "result.pdf",
			});
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "PDF operation failed");
		} finally {
			setWorking(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest">
					<FilePdfIcon className="size-4" />
					{title}
				</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-1 flex-col gap-3">
				{files.length > 0 && (
					<ul className="flex flex-col gap-1">
						{files.map(({ id, file }, index) => (
							<li
								key={id}
								className="flex items-center gap-1 rounded-md border bg-background px-2 py-1"
							>
								<div className="min-w-0 flex-1">
									<p className="truncate text-xs font-medium">{file.name}</p>
									<p className="font-mono text-[10px] text-muted-foreground">
										{formatBytes(file.size)}
									</p>
								</div>
								{multiple && files.length > 1 && (
									<>
										<Button
											variant="ghost"
											size="icon-xs"
											aria-label="Move up"
											disabled={index === 0}
											onClick={() => move(index, -1)}
										>
											<ArrowUpIcon />
										</Button>
										<Button
											variant="ghost"
											size="icon-xs"
											aria-label="Move down"
											disabled={index === files.length - 1}
											onClick={() => move(index, 1)}
										>
											<ArrowDownIcon />
										</Button>
									</>
								)}
								<Button
									variant="ghost"
									size="icon-xs"
									aria-label={`Remove ${file.name}`}
									onClick={() =>
										setFiles((prev) => prev.filter((entry) => entry.id !== id))
									}
								>
									<XIcon />
								</Button>
							</li>
						))}
					</ul>
				)}
				<Button
					variant="outline"
					size="sm"
					className="justify-start"
					onClick={() => inputRef.current?.click()}
				>
					<PlusIcon />
					{multiple ? "Add files" : files.length ? "Replace file" : "Add file"}
				</Button>
				<input
					ref={inputRef}
					type="file"
					accept={accept}
					multiple={multiple}
					className="sr-only"
					tabIndex={-1}
					onChange={(e) => {
						const picked = Array.from(e.currentTarget.files ?? []).map(
							(file) => ({ id: crypto.randomUUID(), file }),
						);
						setFiles((prev) => (multiple ? [...prev, ...picked] : picked));
						e.currentTarget.value = "";
					}}
				/>
				{withRange && (
					<Input
						value={range}
						onChange={(e) => setRange(e.target.value)}
						placeholder="Pages, e.g. 1-3,5 — empty splits every page"
						className="h-8 font-mono text-xs"
					/>
				)}
				<div className="mt-auto flex items-center gap-2 pt-1">
					<Button
						size="sm"
						disabled={working || files.length < minFiles}
						onClick={() => void submit()}
					>
						{working && <Spinner />}
						{cta}
					</Button>
					{result && (
						<Button
							size="sm"
							variant="outline"
							render={
								<a href={result.url} download={result.name}>
									<DownloadSimpleIcon />
									Save
								</a>
							}
						/>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
