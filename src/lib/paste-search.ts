export type PasteSearchFilters = {
	q?: string;
	tag?: string;
};

export type PasteSearchResult =
	| { ok: true; filters: PasteSearchFilters }
	| { ok: false; error: string };

const QUERY_MAX_LENGTH = 100;
const TAG_MAX_LENGTH = 24;

export function parsePasteSearch(params: URLSearchParams): PasteSearchResult {
	if (params.getAll("q").length > 1 || params.getAll("tag").length > 1) {
		return { ok: false, error: "Invalid paste search filters" };
	}

	const q = params.get("q")?.trim();
	const tag = params.get("tag")?.trim().toLowerCase();
	if ((q?.length ?? 0) > QUERY_MAX_LENGTH) {
		return { ok: false, error: "Search text must be 100 characters or less" };
	}
	if ((tag?.length ?? 0) > TAG_MAX_LENGTH) {
		return { ok: false, error: "Tag must be 24 characters or less" };
	}

	return {
		ok: true,
		filters: {
			...(q ? { q } : {}),
			...(tag ? { tag } : {}),
		},
	};
}
