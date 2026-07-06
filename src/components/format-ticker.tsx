import { ArrowRightIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { POPULAR_PAIRS } from "@/lib/formats";
import { cn } from "@/lib/utils";

type Pair = readonly [string, string];

export function FormatTicker({ override }: { override?: Pair | null }) {
	const [index, setIndex] = useState(0);
	const [reduced, setReduced] = useState(false);

	useEffect(() => {
		const query = window.matchMedia("(prefers-reduced-motion: reduce)");
		setReduced(query.matches);
		const onChange = () => setReduced(query.matches);
		query.addEventListener("change", onChange);
		return () => query.removeEventListener("change", onChange);
	}, []);

	useEffect(() => {
		if (override || reduced) return;
		const timer = setInterval(
			() => setIndex((i) => (i + 1) % POPULAR_PAIRS.length),
			2600,
		);
		return () => clearInterval(timer);
	}, [override, reduced]);

	const pair = override ?? POPULAR_PAIRS[index];

	return (
		<div className="flex items-center gap-3 font-mono text-4xl font-medium tracking-tighter sm:gap-4 sm:text-6xl lg:text-7xl">
			<RollingToken value={pair[0]} reduced={reduced} />
			<ArrowRightIcon
				key={`${pair[0]}-${pair[1]}`}
				weight="bold"
				className="size-7 shrink-0 text-muted-foreground motion-safe:animate-nudge sm:size-11"
			/>
			<RollingToken
				value={pair[1]}
				reduced={reduced}
				delayMs={110}
				className="text-muted-foreground"
			/>
		</div>
	);
}

function RollingToken({
	value,
	reduced,
	delayMs = 0,
	className,
}: {
	value: string;
	reduced: boolean;
	delayMs?: number;
	className?: string;
}) {
	const [display, setDisplay] = useState({
		current: value,
		leaving: null as string | null,
	});
	if (display.current !== value) {
		setDisplay({ current: value, leaving: reduced ? null : display.current });
	}
	const delay = { animationDelay: `${delayMs}ms` };
	return (
		<span className={cn("relative inline-block overflow-hidden", className)}>
			{display.leaving && (
				<span
					aria-hidden
					className="absolute inset-0 animate-roll-out uppercase"
					style={delay}
				>
					.{display.leaving}
				</span>
			)}
			<span
				key={display.current}
				className={cn(
					"inline-block uppercase",
					display.leaving && "animate-roll-in",
				)}
				style={delay}
				onAnimationEnd={() => setDisplay((d) => ({ ...d, leaving: null }))}
			>
				.{display.current}
			</span>
		</span>
	);
}
