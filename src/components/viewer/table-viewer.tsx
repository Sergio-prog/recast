import {
	ArrowDownIcon,
	ArrowUpIcon,
	CheckIcon,
	CopyIcon,
	DownloadSimpleIcon,
	MagnifyingGlassIcon,
	PaletteIcon,
	XIcon,
} from "@phosphor-icons/react";
import {
	useCallback,
	useDeferredValue,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { toCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";
import { cellAddress, columnLabel, compareCells } from "@/lib/viewer";

export type Sheet = { name: string; rows: Array<Array<string>> };

const ROW_HEIGHT = 28;
const OVERSCAN = 12;
const ROW_NUMBER_WIDTH = 56;
const MIN_COLUMN = 72;
const MAX_COLUMN = 320;
const CHAR_WIDTH = 7.4;
const WIDTH_SAMPLE = 300;

const RAINBOW_CELL = [
	"bg-[rgba(255,180,84,0.09)]",
	"bg-[rgba(94,234,195,0.08)]",
	"bg-[rgba(125,178,255,0.09)]",
	"bg-[rgba(255,138,184,0.08)]",
	"bg-[rgba(196,148,255,0.09)]",
	"bg-[rgba(214,235,118,0.08)]",
];

const RAINBOW_LETTER = [
	"bg-[rgba(255,180,84,0.2)]",
	"bg-[rgba(94,234,195,0.18)]",
	"bg-[rgba(125,178,255,0.2)]",
	"bg-[rgba(255,138,184,0.18)]",
	"bg-[rgba(196,148,255,0.2)]",
	"bg-[rgba(214,235,118,0.18)]",
];

const KEY_MOVES: Record<string, (pageRows: number) => [number, number]> = {
	ArrowDown: () => [1, 0],
	ArrowUp: () => [-1, 0],
	ArrowLeft: () => [0, -1],
	ArrowRight: () => [0, 1],
	PageDown: (pageRows) => [pageRows, 0],
	PageUp: (pageRows) => [-pageRows, 0],
	Home: () => [0, -Infinity],
	End: () => [0, Infinity],
};

type Sort = { column: number; direction: "asc" | "desc" };
type Selection = { row: number; column: number };

export function TableViewer({
	sheets,
	fileName,
}: {
	sheets: Array<Sheet>;
	fileName: string;
}) {
	const [activeSheet, setActiveSheet] = useState(0);
	const sheet = sheets[Math.min(activeSheet, sheets.length - 1)];
	return (
		<SheetGrid
			key={`${fileName}:${sheet.name}`}
			sheet={sheet}
			sheets={sheets}
			activeSheet={activeSheet}
			onSheetChange={setActiveSheet}
			fileName={fileName}
		/>
	);
}

function SheetGrid({
	sheet,
	sheets,
	activeSheet,
	onSheetChange,
	fileName,
}: {
	sheet: Sheet;
	sheets: Array<Sheet>;
	activeSheet: number;
	onSheetChange: (index: number) => void;
	fileName: string;
}) {
	const { rows } = sheet;
	const [hasHeader, setHasHeader] = useState(true);
	const [rainbow, setRainbow] = useState(false);
	const [sort, setSort] = useState<Sort | null>(null);
	const [query, setQuery] = useState("");
	const [selection, setSelection] = useState<Selection | null>(null);
	const deferredQuery = useDeferredValue(query);

	const columnCount = useMemo(
		() => rows.reduce((max, row) => Math.max(max, row.length), 0),
		[rows],
	);
	const widths = useMemo(
		() => measureColumns(rows, columnCount),
		[rows, columnCount],
	);
	const offsets = useMemo(() => {
		const result = [ROW_NUMBER_WIDTH];
		for (const width of widths) result.push(result[result.length - 1] + width);
		return result;
	}, [widths]);
	const tableWidth = offsets[offsets.length - 1];

	const headerRow = hasHeader ? rows[0] : undefined;
	const firstDataRow = hasHeader && rows.length > 0 ? 1 : 0;

	const order = useMemo(() => {
		const needle = deferredQuery.trim().toLowerCase();
		const indices: Array<number> = [];
		for (let i = firstDataRow; i < rows.length; i++) {
			if (
				needle === "" ||
				rows[i].some((cell) => cell.toLowerCase().includes(needle))
			) {
				indices.push(i);
			}
		}
		if (sort) {
			const { column, direction } = sort;
			const sign = direction === "asc" ? 1 : -1;
			indices.sort(
				(a, b) =>
					sign * compareCells(rows[a][column] ?? "", rows[b][column] ?? ""),
			);
		}
		return indices;
	}, [rows, firstDataRow, deferredQuery, sort]);

	const scrollRef = useRef<HTMLDivElement>(null);
	const [scrollTop, setScrollTop] = useState(0);
	const [viewportHeight, setViewportHeight] = useState(600);

	useLayoutEffect(() => {
		const element = scrollRef.current;
		if (!element) return;
		const observer = new ResizeObserver(() =>
			setViewportHeight(element.clientHeight),
		);
		observer.observe(element);
		return () => observer.disconnect();
	}, []);

	const headerHeight = ROW_HEIGHT * (hasHeader ? 2 : 1);
	const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
	const end = Math.min(
		order.length,
		Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN,
	);
	const visible = order.slice(start, end);

	const positionOf = useCallback((row: number) => order.indexOf(row), [order]);

	const scrollCellIntoView = useCallback(
		(target: Selection) => {
			const element = scrollRef.current;
			if (!element) return;
			const position = positionOf(target.row);
			if (position < 0) return;
			const top = position * ROW_HEIGHT;
			const bottom = top + ROW_HEIGHT;
			const visibleTop = element.scrollTop;
			const visibleBottom = visibleTop + element.clientHeight - headerHeight;
			if (top < visibleTop) element.scrollTop = top;
			else if (bottom > visibleBottom)
				element.scrollTop = bottom - element.clientHeight + headerHeight;
			const left = offsets[target.column];
			const right = offsets[target.column + 1];
			const visibleLeft = element.scrollLeft + ROW_NUMBER_WIDTH;
			const visibleRight = element.scrollLeft + element.clientWidth;
			if (left < visibleLeft) element.scrollLeft = left - ROW_NUMBER_WIDTH;
			else if (right > visibleRight)
				element.scrollLeft = right - element.clientWidth;
		},
		[positionOf, offsets, headerHeight],
	);

	const moveSelection = (deltaRow: number, deltaColumn: number) => {
		if (!selection || order.length === 0) return;
		const position = positionOf(selection.row);
		const nextPosition = Math.min(
			order.length - 1,
			Math.max(0, position + deltaRow),
		);
		const next = {
			row: order[nextPosition],
			column: Math.min(
				columnCount - 1,
				Math.max(0, selection.column + deltaColumn),
			),
		};
		setSelection(next);
		scrollCellIntoView(next);
	};

	const toggleSort = (column: number) => {
		setSort((current) => {
			if (current?.column !== column) return { column, direction: "asc" };
			if (current.direction === "asc") return { column, direction: "desc" };
			return null;
		});
	};

	const saveCsv = () => {
		const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		const base = fileName.replace(/\.[^.]+$/, "");
		anchor.download =
			sheets.length > 1 ? `${base} — ${sheet.name}.csv` : `${base}.csv`;
		anchor.click();
		URL.revokeObjectURL(url);
	};

	const selectedValue =
		selection && rows[selection.row]
			? (rows[selection.row][selection.column] ?? "")
			: "";

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
				<div className="relative min-w-40 flex-1 basis-52 sm:max-w-xs">
					<MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Filter rows"
						aria-label="Filter rows"
						className="h-8 pl-8 pr-8 text-sm"
					/>
					{query && (
						<button
							type="button"
							aria-label="Clear filter"
							onClick={() => setQuery("")}
							className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
						>
							<XIcon className="size-3.5" />
						</button>
					)}
				</div>
				<Toggle
					size="sm"
					variant="outline"
					pressed={hasHeader}
					onPressedChange={(pressed) => {
						setHasHeader(pressed);
						setSelection(null);
					}}
					aria-label="Treat the first row as a header"
					className="text-xs"
				>
					<CheckIcon
						className={cn("size-3.5", !hasHeader && "opacity-0")}
						aria-hidden
					/>
					Header row
				</Toggle>
				<Toggle
					size="sm"
					variant="outline"
					pressed={rainbow}
					onPressedChange={setRainbow}
					aria-label="Tint each column with its own color"
					className="text-xs"
				>
					<PaletteIcon className="size-3.5" aria-hidden />
					Rainbow
				</Toggle>
				{sort && (
					<Button
						variant="ghost"
						size="sm"
						className="text-xs text-muted-foreground"
						onClick={() => setSort(null)}
					>
						<XIcon />
						Sorted by {columnLabel(sort.column)}
					</Button>
				)}
				<div className="ml-auto flex items-center gap-2">
					<Button variant="outline" size="sm" onClick={saveCsv}>
						<DownloadSimpleIcon />
						Save as CSV
					</Button>
				</div>
			</div>
			<FormulaBar selection={selection} value={selectedValue} />
			<div
				ref={scrollRef}
				onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
				className="relative min-h-0 flex-1 overflow-auto overscroll-contain bg-background font-mono text-xs"
			>
				{rows.length === 0 ? (
					<p className="p-6 font-sans text-sm text-muted-foreground">
						This sheet is empty.
					</p>
				) : (
					<table
						// biome-ignore lint/a11y/noNoninteractiveTabindex: the grid is keyboard-navigable with arrow keys
						tabIndex={0}
						aria-label="Sheet grid"
						aria-rowcount={rows.length}
						aria-colcount={columnCount}
						onFocus={() => {
							if (!selection && order.length > 0)
								setSelection({ row: order[0], column: 0 });
						}}
						onKeyDown={(e) => {
							const move = KEY_MOVES[e.key]?.(
								Math.floor(viewportHeight / ROW_HEIGHT),
							);
							if (!move) return;
							e.preventDefault();
							moveSelection(move[0], move[1]);
						}}
						className="border-separate border-spacing-0 text-left outline-none"
						style={{ width: tableWidth, tableLayout: "fixed" }}
					>
						<colgroup>
							<col style={{ width: ROW_NUMBER_WIDTH }} />
							{widths.map((width, index) => (
								<col key={`${columnLabel(index)}`} style={{ width }} />
							))}
						</colgroup>
						<thead>
							<tr style={{ height: ROW_HEIGHT }}>
								<th className="sticky left-0 top-0 z-30 border-b border-r bg-muted" />
								{widths.map((_, column) => {
									const active = sort?.column === column;
									return (
										<th
											key={columnLabel(column)}
											scope="col"
											aria-sort={
												active
													? sort.direction === "asc"
														? "ascending"
														: "descending"
													: "none"
											}
											className={cn(
												"sticky top-0 z-20 border-b border-r bg-muted p-0 font-medium text-muted-foreground",
												rainbow && RAINBOW_LETTER[column % 6],
												selection?.column === column &&
													"text-primary shadow-[inset_0_-2px_0_var(--primary)]",
											)}
										>
											<button
												type="button"
												onClick={() => toggleSort(column)}
												title={`Sort by column ${columnLabel(column)}`}
												className="flex h-full w-full items-center justify-center gap-1 px-2 hover:bg-primary/10 hover:text-foreground"
												style={{ height: ROW_HEIGHT }}
											>
												{columnLabel(column)}
												{active &&
													(sort.direction === "asc" ? (
														<ArrowUpIcon className="size-3" weight="bold" />
													) : (
														<ArrowDownIcon className="size-3" weight="bold" />
													))}
											</button>
										</th>
									);
								})}
							</tr>
							{headerRow && (
								<tr style={{ height: ROW_HEIGHT }}>
									<th
										className="sticky left-0 z-30 border-b border-r bg-muted text-center font-medium text-muted-foreground"
										style={{ top: ROW_HEIGHT }}
									>
										1
									</th>
									{widths.map((_, column) => (
										<th
											key={columnLabel(column)}
											scope="col"
											onMouseDown={() => setSelection({ row: 0, column })}
											className={cn(
												"sticky z-20 truncate border-b border-r bg-card px-2 font-sans text-xs font-semibold",
												rainbow && RAINBOW_CELL[column % 6],
												selection?.row === 0 &&
													selection.column === column &&
													"shadow-[inset_0_0_0_2px_var(--primary)]",
											)}
											style={{ top: ROW_HEIGHT }}
											title={headerRow[column]}
										>
											{headerRow[column] ?? ""}
										</th>
									))}
								</tr>
							)}
						</thead>
						<tbody>
							{start > 0 && <tr style={{ height: start * ROW_HEIGHT }} />}
							{visible.map((rowIndex) => (
								<GridRow
									key={rowIndex}
									rowIndex={rowIndex}
									cells={rows[rowIndex]}
									columnCount={columnCount}
									selection={selection}
									rainbow={rainbow}
									onSelect={setSelection}
								/>
							))}
							{end < order.length && (
								<tr style={{ height: (order.length - end) * ROW_HEIGHT }} />
							)}
						</tbody>
					</table>
				)}
				{rows.length > 0 && order.length === 0 && (
					<p className="absolute inset-x-0 top-20 text-center font-sans text-sm text-muted-foreground">
						No rows match “{deferredQuery}”.
					</p>
				)}
			</div>
			<div className="flex items-center gap-3 border-t bg-muted/40 px-3 text-xs">
				{sheets.length > 1 ? (
					<div
						role="tablist"
						aria-label="Sheets"
						className="-mb-px flex min-w-0 flex-1 gap-1 overflow-x-auto py-1.5"
					>
						{sheets.map((entry, index) => (
							<button
								key={entry.name}
								type="button"
								role="tab"
								aria-selected={index === activeSheet}
								onClick={() => onSheetChange(index)}
								className={cn(
									"shrink-0 rounded-md border px-2.5 py-1 font-medium transition-colors",
									index === activeSheet
										? "border-border bg-background text-foreground shadow-xs"
										: "border-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground",
								)}
							>
								{entry.name}
							</button>
						))}
					</div>
				) : (
					<span className="flex-1 truncate py-2 text-muted-foreground">
						{sheet.name}
					</span>
				)}
				<p className="shrink-0 py-2 font-mono tabular-nums text-muted-foreground">
					{order.length !== rows.length - firstDataRow && (
						<>{order.length.toLocaleString()} of </>
					)}
					{(rows.length - firstDataRow).toLocaleString()} rows ×{" "}
					{columnCount.toLocaleString()} cols
				</p>
			</div>
		</div>
	);
}

function GridRow({
	rowIndex,
	cells,
	columnCount,
	selection,
	rainbow,
	onSelect,
}: {
	rowIndex: number;
	cells: Array<string>;
	columnCount: number;
	selection: Selection | null;
	rainbow: boolean;
	onSelect: (selection: Selection) => void;
}) {
	const rowSelected = selection?.row === rowIndex;
	return (
		<tr style={{ height: ROW_HEIGHT }} className="group/row">
			<th
				scope="row"
				className={cn(
					"sticky left-0 z-10 border-b border-r bg-muted text-center font-medium text-muted-foreground",
					rowSelected && "text-primary shadow-[inset_-2px_0_0_var(--primary)]",
				)}
			>
				{rowIndex + 1}
			</th>
			{Array.from({ length: columnCount }, (_, column) => {
				const value = cells[column] ?? "";
				const selected = rowSelected && selection.column === column;
				return (
					<td
						key={columnLabel(column)}
						onMouseDown={() => onSelect({ row: rowIndex, column })}
						className={cn(
							"truncate border-b border-r px-2 text-foreground group-hover/row:bg-muted/40",
							rainbow && RAINBOW_CELL[column % 6],
							selected &&
								"bg-primary/5 shadow-[inset_0_0_0_2px_var(--primary)]",
						)}
					>
						{value}
					</td>
				);
			})}
		</tr>
	);
}

function FormulaBar({
	selection,
	value,
}: {
	selection: Selection | null;
	value: string;
}) {
	const [copied, setCopied] = useState(false);
	useEffect(() => {
		if (!copied) return;
		const timer = setTimeout(() => setCopied(false), 1400);
		return () => clearTimeout(timer);
	}, [copied]);
	return (
		<div className="flex items-stretch border-b bg-muted/30 font-mono text-xs">
			<div className="flex w-20 shrink-0 items-center justify-center border-r font-medium tabular-nums text-muted-foreground">
				{selection ? cellAddress(selection.row, selection.column) : "—"}
			</div>
			<div
				className="min-h-8 min-w-0 flex-1 whitespace-pre-wrap break-words px-3 py-1.5 leading-5 [max-height:5.5rem] overflow-y-auto"
				aria-live="polite"
			>
				{selection ? (
					value === "" ? (
						<span className="text-muted-foreground">empty cell</span>
					) : (
						value
					)
				) : (
					<span className="text-muted-foreground">
						Select a cell to read its full value. Arrow keys move around.
					</span>
				)}
			</div>
			{selection && value !== "" && (
				<button
					type="button"
					aria-label="Copy cell value"
					onClick={() => {
						void navigator.clipboard.writeText(value);
						setCopied(true);
					}}
					className="flex w-9 shrink-0 items-center justify-center border-l text-muted-foreground transition-colors hover:text-foreground"
				>
					{copied ? (
						<CheckIcon className="size-3.5" weight="bold" />
					) : (
						<CopyIcon className="size-3.5" />
					)}
				</button>
			)}
		</div>
	);
}

function measureColumns(
	rows: Array<Array<string>>,
	columnCount: number,
): Array<number> {
	const widths = new Array<number>(columnCount).fill(MIN_COLUMN);
	const stride = Math.max(1, Math.floor(rows.length / WIDTH_SAMPLE));
	for (let i = 0; i < rows.length; i += stride) {
		const row = rows[i];
		for (let column = 0; column < row.length; column++) {
			const firstLine = row[column].split("\n", 1)[0];
			const needed = firstLine.length * CHAR_WIDTH + 18;
			if (needed > widths[column])
				widths[column] = Math.min(MAX_COLUMN, Math.ceil(needed));
		}
	}
	return widths;
}
