const START_ANGLE = 150;
const SWEEP = 240;
const MAXIMUM_MBPS = 10_000;
const PATH_LENGTH = 100;

function point(angle: number, radius: number) {
	const radians = (angle * Math.PI) / 180;
	return {
		x: 160 + radius * Math.cos(radians),
		y: 160 + radius * Math.sin(radians),
	};
}

function arc(start: number, end: number, radius: number) {
	const from = point(start, radius);
	const to = point(end, radius);
	return `M ${from.x} ${from.y} A ${radius} ${radius} 0 ${end - start > 180 ? 1 : 0} 1 ${to.x} ${to.y}`;
}

function valueAngle(value: number, maximum: number) {
	const clamped = Math.max(0, Math.min(value, maximum));
	return (
		START_ANGLE + (Math.log10(clamped + 1) / Math.log10(maximum + 1)) * SWEEP
	);
}

function formatTick(value: number) {
	return value >= 1_000 ? `${value / 1_000}k` : value;
}

type SpeedometerProps = {
	value: number;
	label: string;
	active: boolean;
};

export function Speedometer({ value, label, active }: SpeedometerProps) {
	const angle = valueAngle(value, MAXIMUM_MBPS);
	const progress = ((angle - START_ANGLE) / SWEEP) * PATH_LENGTH;
	const needle = point(START_ANGLE, 91);
	const ticks = [0, 1, 10, 100, 1_000, MAXIMUM_MBPS];

	return (
		<div
			className="relative mx-auto aspect-[16/11] w-full max-w-xl"
			aria-live="polite"
		>
			<svg
				viewBox="0 25 320 220"
				className="h-full w-full"
				role="img"
				aria-label={`${label}: ${value.toFixed(1)} megabits per second`}
			>
				<title>{label} speed</title>
				<path
					d={arc(START_ANGLE, START_ANGLE + SWEEP, 112)}
					fill="none"
					stroke="currentColor"
					strokeWidth="12"
					className="text-muted"
					strokeLinecap="round"
				/>
				<path
					d={arc(START_ANGLE, START_ANGLE + SWEEP, 112)}
					fill="none"
					stroke="currentColor"
					strokeWidth="12"
					pathLength={PATH_LENGTH}
					strokeDasharray={PATH_LENGTH}
					strokeDashoffset={PATH_LENGTH - progress}
					className="text-foreground transition-[stroke-dashoffset,opacity] duration-300 ease-out motion-reduce:transition-none"
					strokeLinecap="round"
					opacity={value > 0 ? 1 : 0}
					data-testid="speedometer-progress"
				/>
				{ticks.map((tick) => {
					const tickAngle = valueAngle(tick, MAXIMUM_MBPS);
					const inner = point(tickAngle, 94);
					const outer = point(tickAngle, 103);
					const text = point(tickAngle, 78);
					return (
						<g key={tick}>
							<line
								x1={inner.x}
								y1={inner.y}
								x2={outer.x}
								y2={outer.y}
								stroke="currentColor"
								className="text-muted-foreground"
								strokeWidth="1.5"
							/>
							<text
								x={text.x}
								y={text.y}
								textAnchor="middle"
								dominantBaseline="middle"
								className="fill-muted-foreground font-mono text-[8px]"
							>
								{formatTick(tick)}
							</text>
						</g>
					);
				})}
				<line
					x1="160"
					y1="160"
					x2={needle.x}
					y2={needle.y}
					stroke="currentColor"
					strokeWidth="3"
					strokeLinecap="round"
					className="text-foreground transition-transform duration-300 ease-out motion-reduce:transition-none"
					style={{
						transform: `rotate(${angle - START_ANGLE}deg)`,
						transformBox: "view-box",
						transformOrigin: "160px 160px",
					}}
					data-testid="speedometer-needle"
				/>
				<circle
					cx="160"
					cy="160"
					r="7"
					fill="currentColor"
					className="text-foreground"
				/>
				<text
					x="160"
					y="202"
					textAnchor="middle"
					className="fill-foreground font-mono text-[30px] font-medium tabular-nums"
				>
					{value > 0 ? value.toFixed(1) : "0.0"}
				</text>
				<text
					x="160"
					y="220"
					textAnchor="middle"
					className="fill-muted-foreground font-mono text-[9px] uppercase tracking-[0.25em]"
				>
					Mbps
				</text>
			</svg>
			<p className="absolute inset-x-0 bottom-0 text-center font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
				{active ? `${label} in progress` : label}
			</p>
		</div>
	);
}
