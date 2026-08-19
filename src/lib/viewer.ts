export type ViewerKind = "csv" | "xlsx" | "pdf";

export const VIEWER_ACCEPT =
	".csv,.tsv,.txt,.xlsx,.xlsm,.xls,.ods,.pdf,text/csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const KIND_BY_EXTENSION: Record<string, ViewerKind> = {
	csv: "csv",
	tsv: "csv",
	txt: "csv",
	xlsx: "xlsx",
	xlsm: "xlsx",
	xls: "xlsx",
	ods: "xlsx",
	pdf: "pdf",
};

export function detectKind(file: {
	name: string;
	type?: string;
}): ViewerKind | null {
	const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
	if (KIND_BY_EXTENSION[ext]) return KIND_BY_EXTENSION[ext];
	if (file.type === "application/pdf") return "pdf";
	if (file.type === "text/csv" || file.type === "text/tab-separated-values")
		return "csv";
	if (file.type?.includes("spreadsheet") || file.type?.includes("ms-excel"))
		return "xlsx";
	return null;
}

export function columnLabel(index: number): string {
	let label = "";
	let n = index;
	while (n >= 0) {
		label = String.fromCharCode(65 + (n % 26)) + label;
		n = Math.floor(n / 26) - 1;
	}
	return label;
}

export function cellAddress(row: number, column: number): string {
	return `${columnLabel(column)}${row + 1}`;
}

const NUMERIC = /^-?\d+(\.\d+)?$/;

export function compareCells(a: string, b: string): number {
	const left = a.trim();
	const right = b.trim();
	if (left === "" && right !== "") return 1;
	if (right === "" && left !== "") return -1;
	const leftNumber = left.replace(/,/g, "");
	const rightNumber = right.replace(/,/g, "");
	if (NUMERIC.test(leftNumber) && NUMERIC.test(rightNumber)) {
		return Number(leftNumber) - Number(rightNumber);
	}
	return left.localeCompare(right, undefined, {
		numeric: true,
		sensitivity: "base",
	});
}
