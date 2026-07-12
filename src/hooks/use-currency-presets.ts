import { useState } from "react";

export type CurrencyPair = { from: string; to: string };

const STORAGE_KEY = "recast:currency-pairs:v1";
const MAX_PRESETS = 8;

function loadPresets(): Array<CurrencyPair> {
	if (typeof window === "undefined") return [];
	try {
		const value: unknown = JSON.parse(
			localStorage.getItem(STORAGE_KEY) ?? "[]",
		);
		if (!Array.isArray(value)) return [];
		return value
			.filter(
				(pair): pair is CurrencyPair =>
					typeof pair === "object" &&
					pair !== null &&
					typeof pair.from === "string" &&
					typeof pair.to === "string",
			)
			.slice(0, MAX_PRESETS);
	} catch {
		return [];
	}
}

export function useCurrencyPresets() {
	const [presets, setPresets] = useState<Array<CurrencyPair>>(loadPresets);

	const save = (pair: CurrencyPair) => {
		setPresets((current) => {
			if (
				current.some((item) => item.from === pair.from && item.to === pair.to)
			) {
				return current;
			}
			const next = [...current, pair].slice(-MAX_PRESETS);
			localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
			return next;
		});
	};

	const remove = (pair: CurrencyPair) => {
		setPresets((current) => {
			const next = current.filter(
				(item) => item.from !== pair.from || item.to !== pair.to,
			);
			localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
			return next;
		});
	};

	return { presets, save, remove };
}
