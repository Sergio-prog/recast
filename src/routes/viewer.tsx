import {
	FileCsvIcon,
	FilePdfIcon,
	FileXlsIcon,
	FolderOpenIcon,
	type Icon,
	XIcon,
} from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Dropzone } from "@/components/dropzone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PdfViewer } from "@/components/viewer/pdf-viewer";
import { type Sheet, TableViewer } from "@/components/viewer/table-viewer";
import { parseCsv, sniffDelimiter } from "@/lib/csv";
import { formatBytes } from "@/lib/formats";
import { cn } from "@/lib/utils";
import { detectKind, VIEWER_ACCEPT, type ViewerKind } from "@/lib/viewer";

export const Route = createFileRoute("/viewer")({
	head: () => ({
		meta: [
			{ title: "File viewer — Recast" },
			{
				name: "description",
				content:
					"Open CSV, Excel and PDF files in your browser. Sort and filter tables, read every sheet, zoom and select text in PDFs. Nothing is uploaded.",
			},
		],
	}),
	component: ViewerPage,
});

type Loaded =
	| { kind: "csv" | "xlsx"; sheets: Array<Sheet>; note: string }
	| { kind: "pdf"; data: ArrayBuffer; note: string };

type Opened = {
	file: File;
	kind: ViewerKind;
	content: Loaded | null;
};

const KIND_META: Record<
	ViewerKind,
	{ label: string; icon: Icon; formats: string; blurb: string }
> = {
	csv: {
		label: "CSV",
		icon: FileCsvIcon,
		formats: "CSV · TSV · TXT",
		blurb:
			"Comma, semicolon, tab or pipe — detected for you. Sort by column, filter rows, read any cell in full.",
	},
	xlsx: {
		label: "Excel",
		icon: FileXlsIcon,
		formats: "XLSX · XLS · XLSM · ODS",
		blurb:
			"Every sheet, values shown as the workbook formats them. Save any sheet as CSV.",
	},
	pdf: {
		label: "PDF",
		icon: FilePdfIcon,
		formats: "PDF",
		blurb: "Page thumbnails, zoom and rotate. Text stays selectable.",
	},
};

const DELIMITER_NAME: Record<string, string> = {
	",": "comma",
	";": "semicolon",
	"\t": "tab",
	"|": "pipe",
};

async function load(file: File, kind: ViewerKind): Promise<Loaded> {
	if (kind === "pdf") {
		const data = await file.arrayBuffer();
		return { kind, data, note: "" };
	}
	if (kind === "csv") {
		const text = await file.text();
		const delimiter = sniffDelimiter(text);
		const rows = parseCsv(text, delimiter);
		return {
			kind,
			sheets: [{ name: file.name, rows }],
			note: `${DELIMITER_NAME[delimiter]}-separated`,
		};
	}
	const XLSX = await import("xlsx");
	const workbook = XLSX.read(await file.arrayBuffer(), {
		type: "array",
		cellDates: true,
		dense: true,
	});
	const sheets = workbook.SheetNames.map((name) => ({
		name,
		rows: XLSX.utils
			.sheet_to_json<Array<unknown>>(workbook.Sheets[name], {
				header: 1,
				raw: false,
				defval: "",
				blankrows: true,
			})
			.map((row) => row.map((cell) => (cell == null ? "" : String(cell)))),
	}));
	return {
		kind,
		sheets,
		note: `${sheets.length} sheet${sheets.length === 1 ? "" : "s"}`,
	};
}

function ViewerPage() {
	const [opened, setOpened] = useState<Opened | null>(null);
	const [dragging, setDragging] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const requestRef = useRef(0);

	const open = useCallback((files: Array<File>) => {
		const file = files[0];
		if (!file) return;
		const kind = detectKind(file);
		if (!kind) {
			toast.error(
				`${file.name} isn’t a CSV, Excel or PDF file. Drop one of those to open it.`,
			);
			return;
		}
		const request = ++requestRef.current;
		setOpened({ file, kind, content: null });
		void load(file, kind)
			.then((content) => {
				if (requestRef.current !== request) return;
				setOpened({ file, kind, content });
			})
			.catch((e) => {
				console.error(e);
				if (requestRef.current !== request) return;
				setOpened(null);
				toast.error(
					`${file.name} couldn’t be opened. The file may be damaged.`,
				);
			});
	}, []);

	useEffect(() => {
		let depth = 0;
		const onDragEnter = (e: DragEvent) => {
			if (!e.dataTransfer?.types.includes("Files")) return;
			depth++;
			setDragging(true);
		};
		const onDragLeave = () => {
			depth = Math.max(0, depth - 1);
			if (depth === 0) setDragging(false);
		};
		const onDragOver = (e: DragEvent) => {
			if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
		};
		const onDrop = (e: DragEvent) => {
			depth = 0;
			setDragging(false);
			if (e.defaultPrevented || !e.dataTransfer?.files.length) return;
			e.preventDefault();
			open(Array.from(e.dataTransfer.files));
		};
		const onPaste = (e: ClipboardEvent) => {
			const files = Array.from(e.clipboardData?.files ?? []);
			if (files.length) open(files);
		};
		window.addEventListener("dragenter", onDragEnter);
		window.addEventListener("dragleave", onDragLeave);
		window.addEventListener("dragover", onDragOver);
		window.addEventListener("drop", onDrop);
		window.addEventListener("paste", onPaste);
		return () => {
			window.removeEventListener("dragenter", onDragEnter);
			window.removeEventListener("dragleave", onDragLeave);
			window.removeEventListener("dragover", onDragOver);
			window.removeEventListener("drop", onDrop);
			window.removeEventListener("paste", onPaste);
		};
	}, [open]);

	const close = () => {
		requestRef.current++;
		setOpened(null);
	};

	return (
		<main
			className={cn(
				"mx-auto w-full max-w-6xl px-4 pb-12 pt-10",
				opened && "pb-6 pt-6",
			)}
		>
			<input
				ref={inputRef}
				type="file"
				accept={VIEWER_ACCEPT}
				className="sr-only"
				tabIndex={-1}
				onChange={(e) => {
					open(Array.from(e.currentTarget.files ?? []));
					e.currentTarget.value = "";
				}}
			/>
			{opened ? (
				<>
					<div className="flex flex-wrap items-center gap-x-3 gap-y-2">
						<Badge variant="outline" className="font-mono uppercase">
							{KIND_META[opened.kind].label}
						</Badge>
						<p className="min-w-0 flex-1 basis-48 truncate font-medium">
							{opened.file.name}
						</p>
						<p className="font-mono text-xs text-muted-foreground">
							{formatBytes(opened.file.size)}
							{opened.content?.note ? ` · ${opened.content.note}` : ""}
						</p>
						<div className="ml-auto flex items-center gap-1">
							<Button
								variant="outline"
								size="sm"
								onClick={() => inputRef.current?.click()}
							>
								<FolderOpenIcon />
								Open another
							</Button>
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label="Close file"
								onClick={close}
							>
								<XIcon />
							</Button>
						</div>
					</div>
					<section
						aria-label="File contents"
						className="mt-3 flex h-[calc(100svh-9.5rem)] min-h-[28rem] flex-col overflow-hidden rounded-xl border bg-card"
					>
						{opened.content === null ? (
							<div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
								<Spinner />
								Reading {opened.file.name}
							</div>
						) : opened.content.kind === "pdf" ? (
							<PdfViewer data={opened.content.data} />
						) : (
							<TableViewer
								sheets={opened.content.sheets}
								fileName={opened.file.name}
							/>
						)}
					</section>
				</>
			) : (
				<>
					<p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
						File viewer
					</p>
					<h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
						Open the file, skip the app.
					</h1>
					<p className="mt-4 max-w-xl text-muted-foreground">
						CSV, Excel and PDF files open right here in your browser — nothing
						is uploaded, nothing is installed. Drop one, paste one, or browse.
					</p>
					<Dropzone
						onFiles={open}
						label="Drop a file to open it"
						hint="or click to browse — CSV, XLSX, PDF"
						accept={VIEWER_ACCEPT}
						multiple={false}
						className="mt-8"
					/>
					<div className="mt-6 grid gap-3 sm:grid-cols-3">
						{(Object.keys(KIND_META) as Array<ViewerKind>).map((kind) => {
							const meta = KIND_META[kind];
							return (
								<div key={kind} className="rounded-xl border bg-card p-4">
									<div className="flex items-center gap-2">
										<meta.icon className="size-4 text-muted-foreground" />
										<h2 className="font-mono text-xs uppercase tracking-widest">
											{meta.formats}
										</h2>
									</div>
									<p className="mt-2 text-sm text-muted-foreground">
										{meta.blurb}
									</p>
								</div>
							);
						})}
					</div>
				</>
			)}
			<div
				aria-hidden
				className={cn(
					"pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm transition-opacity",
					dragging ? "opacity-100" : "opacity-0",
				)}
			>
				<div className="rounded-2xl border-2 border-dashed border-primary bg-card px-10 py-8 font-mono text-sm font-semibold uppercase tracking-[0.25em] shadow-lg">
					Drop to open
				</div>
			</div>
		</main>
	);
}
