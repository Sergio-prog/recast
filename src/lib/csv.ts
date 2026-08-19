export type Delimiter = "," | ";" | "\t" | "|";

const DELIMITERS: Array<Delimiter> = [",", ";", "\t", "|"];

export function sniffDelimiter(text: string): Delimiter {
	const sample = text.slice(0, 64 * 1024);
	let best: Delimiter = ",";
	let bestScore = -1;
	for (const delimiter of DELIMITERS) {
		const rows = parseCsv(sample, delimiter).slice(0, 20);
		if (rows.length === 0) continue;
		const counts = rows.map((row) => row.length - 1);
		const total = counts.reduce((sum, count) => sum + count, 0);
		if (total === 0) continue;
		const consistent = counts.filter((count) => count === counts[0]).length;
		const score = total * (consistent / counts.length);
		if (score > bestScore) {
			bestScore = score;
			best = delimiter;
		}
	}
	return best;
}

export function parseCsv(
	text: string,
	delimiter: Delimiter = sniffDelimiter(text),
): Array<Array<string>> {
	const rows: Array<Array<string>> = [];
	let row: Array<string> = [];
	let field = "";
	let quoted = false;
	const start = text.charCodeAt(0) === 0xfeff ? 1 : 0;
	for (let i = start; i < text.length; i++) {
		const char = text[i];
		if (quoted) {
			if (char === '"') {
				if (text[i + 1] === '"') {
					field += '"';
					i++;
				} else {
					quoted = false;
				}
			} else {
				field += char;
			}
			continue;
		}
		if (char === '"') {
			quoted = true;
		} else if (char === delimiter) {
			row.push(field);
			field = "";
		} else if (char === "\n" || char === "\r") {
			if (char === "\r" && text[i + 1] === "\n") i++;
			row.push(field);
			rows.push(row);
			row = [];
			field = "";
		} else {
			field += char;
		}
	}
	if (field !== "" || row.length > 0) {
		row.push(field);
		rows.push(row);
	}
	return rows;
}

export function toCsv(rows: Array<Array<string>>): string {
	return rows
		.map((row) =>
			row
				.map((cell) =>
					/[",\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell,
				)
				.join(","),
		)
		.join("\r\n");
}
