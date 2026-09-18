import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import { type ReactNode, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const FOCUS_RING =
	"outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function Section({
	title,
	value,
	children,
}: {
	title: string;
	value?: string;
	children: ReactNode;
}) {
	return (
		<section className="border-b py-4 first:pt-0 last:border-b-0 last:pb-0">
			<div className="mb-2.5 flex items-baseline justify-between gap-3">
				<h2 className="text-xs font-medium">{title}</h2>
				{value && (
					<span className="truncate text-xs text-muted-foreground">
						{value}
					</span>
				)}
			</div>
			<div className="flex flex-col gap-2">{children}</div>
		</section>
	);
}

export function Row({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<div className="flex min-h-8 items-center justify-between gap-3">
			<span className="text-xs text-muted-foreground">{label}</span>
			{children}
		</div>
	);
}

type SegmentedOption<T> = { value: T; label: ReactNode; ariaLabel?: string };

export function Segmented<T extends string | number>({
	label,
	options,
	value,
	onChange,
	className,
}: {
	label: string;
	options: Array<SegmentedOption<T>>;
	value: T;
	onChange: (value: T) => void;
	className?: string;
}) {
	const activeIndex = Math.max(
		0,
		options.findIndex((option) => option.value === value),
	);

	return (
		<div
			role="toolbar"
			aria-label={label}
			className={cn(
				"relative grid h-8 shrink-0 rounded-lg bg-muted p-0.5 text-xs",
				className,
			)}
			style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
		>
			<span
				aria-hidden
				className="pointer-events-none absolute inset-y-0.5 left-0.5 rounded-md bg-background shadow-[0_1px_2px_rgba(0,0,0,0.12),0_0_0_0.5px_rgba(0,0,0,0.06)] transition-transform duration-300 ease-out-expo motion-reduce:transition-none dark:bg-foreground/15 dark:shadow-none"
				style={{
					width: `calc((100% - 4px) / ${options.length})`,
					transform: `translateX(${activeIndex * 100}%)`,
				}}
			/>
			{options.map((option, index) => {
				const active = index === activeIndex;
				return (
					<button
						key={String(option.value)}
						type="button"
						aria-pressed={active}
						aria-label={option.ariaLabel}
						onClick={() => onChange(option.value)}
						className={cn(
							"relative z-10 flex items-center justify-center gap-1.5 rounded-md px-1 transition-[color,scale] duration-200 active:scale-[0.96] [&_svg]:size-3.5",
							FOCUS_RING,
							active
								? "text-foreground"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						{option.label}
					</button>
				);
			})}
		</div>
	);
}

const FINE_DRAG_FACTOR = 0.2;
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const keyedFromRight = (text: string) => {
	const chars = Array.from(text);
	return chars.map((char, index) => ({
		char,
		key: `slot-${chars.length - index}`,
	}));
};

export function RollingNumber({ text }: { text: string }) {
	return (
		<span aria-hidden className="flex h-4 font-mono leading-4">
			{keyedFromRight(text).map(({ char, key }) =>
				/\d/.test(char) ? (
					<span
						key={key}
						className="relative inline-block h-4 w-[1ch] animate-char-in overflow-hidden"
					>
						<span
							className="absolute inset-x-0 top-0 flex flex-col transition-transform duration-300 ease-out-expo motion-reduce:transition-none"
							style={{ transform: `translateY(-${Number(char) * 10}%)` }}
						>
							{DIGITS.map((digit) => (
								<span key={digit} className="h-4 text-center">
									{digit}
								</span>
							))}
						</span>
					</span>
				) : (
					<span key={`${key}-${char}`} className="animate-char-in">
						{char}
					</span>
				),
			)}
		</span>
	);
}

export function ResetButton({
	visible,
	label,
	onReset,
	className,
}: {
	visible: boolean;
	label: string;
	onReset: () => void;
	className?: string;
}) {
	return (
		<button
			type="button"
			aria-label={label}
			title={label}
			disabled={!visible}
			onClick={onReset}
			className={cn(
				"flex size-5 items-center justify-center rounded-md text-muted-foreground transition-[opacity,scale,rotate,color,background-color] duration-300 ease-out-expo hover:bg-foreground/10 hover:text-foreground active:-rotate-90 disabled:pointer-events-none disabled:scale-50 disabled:opacity-0 motion-reduce:transition-opacity",
				FOCUS_RING,
				className,
			)}
		>
			<ArrowCounterClockwiseIcon className="size-3" weight="bold" />
		</button>
	);
}

export function ScrubSlider({
	label,
	value,
	min,
	max,
	step,
	defaultValue,
	format = (v) => String(v),
	onChange,
}: {
	label: string;
	value: number;
	min: number;
	max: number;
	step: number;
	defaultValue: number;
	format?: (value: number) => string;
	onChange: (value: number) => void;
}) {
	const [pointerFraction, setPointerFraction] = useState<number | null>(null);
	const drag = useRef<{ lastX: number; value: number } | null>(null);
	const dragging = pointerFraction !== null;
	const fraction = pointerFraction ?? (value - min) / (max - min);
	const dirty = value !== defaultValue;

	const commit = (raw: number) => {
		const snapped = Math.round(raw / step) * step;
		const next = Math.min(max, Math.max(min, Number(snapped.toFixed(4))));
		if (next !== value) onChange(next);
	};

	const track = (raw: number, clientX: number) => {
		const next = Math.min(max, Math.max(min, raw));
		drag.current = { lastX: clientX, value: next };
		setPointerFraction((next - min) / (max - min));
		commit(next);
	};

	const release = () => {
		drag.current = null;
		setPointerFraction(null);
	};

	return (
		<div className="group/scrub relative h-8 text-xs" data-dragging={dragging}>
			<div
				role="slider"
				tabIndex={0}
				aria-label={label}
				aria-valuemin={min}
				aria-valuemax={max}
				aria-valuenow={value}
				aria-valuetext={format(value)}
				onPointerDown={(e) => {
					if (e.button !== 0) return;
					e.currentTarget.setPointerCapture(e.pointerId);
					const rect = e.currentTarget.getBoundingClientRect();
					track(
						min + ((e.clientX - rect.left) / rect.width) * (max - min),
						e.clientX,
					);
				}}
				onPointerMove={(e) => {
					if (!drag.current) return;
					const rect = e.currentTarget.getBoundingClientRect();
					const delta =
						((e.clientX - drag.current.lastX) / rect.width) *
						(max - min) *
						(e.shiftKey ? FINE_DRAG_FACTOR : 1);
					track(drag.current.value + delta, e.clientX);
				}}
				onPointerUp={release}
				onPointerCancel={release}
				onDoubleClick={() => commit(defaultValue)}
				onKeyDown={(e) => {
					const big = e.shiftKey ? 10 : 1;
					if (e.key === "ArrowRight" || e.key === "ArrowUp") {
						e.preventDefault();
						commit(value + step * big);
					}
					if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
						e.preventDefault();
						commit(value - step * big);
					}
					if (e.key === "Home") {
						e.preventDefault();
						commit(min);
					}
					if (e.key === "End") {
						e.preventDefault();
						commit(max);
					}
				}}
				className={cn(
					"absolute inset-0 flex cursor-ew-resize touch-none items-center justify-between overflow-hidden rounded-lg bg-muted px-2.5 select-none",
					FOCUS_RING,
				)}
			>
				<span
					aria-hidden
					className="absolute inset-0 origin-left bg-foreground/[0.07] transition-[transform,background-color] duration-300 ease-out-expo group-hover/scrub:bg-foreground/10 group-data-[dragging=true]/scrub:duration-0 dark:bg-foreground/10 dark:group-hover/scrub:bg-foreground/15"
					style={{ transform: `scaleX(${fraction})` }}
				/>
				<span
					aria-hidden
					className="absolute inset-0 transition-transform duration-300 ease-out-expo group-data-[dragging=true]/scrub:duration-0"
					style={{ transform: `translateX(${fraction * 100}%)` }}
				>
					<span className="absolute inset-y-2 -left-px w-0.5 rounded-full bg-foreground/25 transition-[background-color,inset] duration-200 group-hover/scrub:bg-foreground/60 group-data-[dragging=true]/scrub:inset-y-1.5 group-data-[dragging=true]/scrub:bg-foreground" />
				</span>
				<span className="relative text-muted-foreground transition-colors group-hover/scrub:text-foreground">
					{label}
				</span>
				<span
					className={cn(
						"relative flex transition-transform duration-300 ease-out-expo motion-reduce:transition-none",
						dirty && "-translate-x-6",
					)}
				>
					<RollingNumber text={format(value)} />
				</span>
			</div>
			<ResetButton
				visible={dirty}
				label={`Reset ${label.toLowerCase()}`}
				onReset={() => commit(defaultValue)}
				className="absolute top-1.5 right-1.5"
			/>
		</div>
	);
}

export function SwitchRow({
	label,
	checked,
	onChange,
}: {
	label: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
}) {
	const id = useId();
	return (
		<div className="flex min-h-8 items-center justify-between gap-3">
			<label htmlFor={id} className="text-xs text-muted-foreground">
				{label}
			</label>
			<SwitchPrimitive.Root
				id={id}
				checked={checked}
				onCheckedChange={onChange}
				className={cn(
					"group/switch relative h-5 w-9 shrink-0 cursor-pointer rounded-full bg-foreground/15 transition-colors duration-300 data-checked:bg-foreground",
					FOCUS_RING,
				)}
			>
				<SwitchPrimitive.Thumb className="absolute top-0.5 left-0.5 block h-4 w-4 rounded-full bg-background shadow-[0_1px_2px_rgba(0,0,0,0.25)] transition-[translate,width] duration-300 ease-out-expo group-active/switch:w-5 data-checked:translate-x-4 group-active/switch:data-checked:translate-x-3 motion-reduce:transition-none" />
			</SwitchPrimitive.Root>
		</div>
	);
}

export function SwapIcon({
	swapped,
	from,
	to,
}: {
	swapped: boolean;
	from: ReactNode;
	to: ReactNode;
}) {
	const layer =
		"col-start-1 row-start-1 transition-[opacity,scale,filter] duration-300 ease-out-expo motion-reduce:transition-opacity";
	const hidden = "scale-50 opacity-0 blur-[3px]";
	return (
		<span className="inline-grid [&_svg]:size-4" aria-hidden>
			<span className={cn(layer, swapped && hidden)}>{from}</span>
			<span className={cn(layer, !swapped && hidden)}>{to}</span>
		</span>
	);
}
