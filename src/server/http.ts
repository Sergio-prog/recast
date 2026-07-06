export function contentDisposition(filename: string): string {
	const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'");
	return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
