import { cn } from "@/lib/utils";

export const CHECKERBOARD =
	"bg-[linear-gradient(45deg,var(--color-muted)_25%,transparent_25%,transparent_75%,var(--color-muted)_75%),linear-gradient(45deg,var(--color-muted)_25%,transparent_25%,transparent_75%,var(--color-muted)_75%)] bg-[size:16px_16px] bg-[position:0_0,8px_8px]";
const CHECKERBOARD_SM =
	"bg-[linear-gradient(45deg,var(--color-muted)_25%,transparent_25%,transparent_75%,var(--color-muted)_75%),linear-gradient(45deg,var(--color-muted)_25%,transparent_25%,transparent_75%,var(--color-muted)_75%)] bg-[size:8px_8px] bg-[position:0_0,4px_4px]";

export function withBackground(
	source: HTMLCanvasElement | HTMLImageElement,
	color: string | null,
): HTMLCanvasElement {
	const canvas = document.createElement("canvas");
	canvas.width =
		source instanceof HTMLImageElement ? source.naturalWidth : source.width;
	canvas.height =
		source instanceof HTMLImageElement ? source.naturalHeight : source.height;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Canvas is not available");
	if (color) {
		ctx.fillStyle = color;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}
	ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
	return canvas;
}

export function BackgroundPicker({
	value,
	onChange,
}: {
	value: string | null;
	onChange: (value: string | null) => void;
}) {
	return (
		<div className="flex items-center gap-1.5">
			<span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
				Background
			</span>
			<button
				type="button"
				onClick={() => onChange(null)}
				aria-label="Transparent background"
				aria-pressed={value === null}
				title="Transparent"
				className={cn(
					"size-7 rounded-md border transition-shadow",
					CHECKERBOARD_SM,
					value === null && "border-primary ring-[3px] ring-ring/50",
				)}
			/>
			<label
				title="Pick a background color"
				className={cn(
					"relative block size-7 cursor-pointer overflow-hidden rounded-md border transition-shadow",
					value !== null && "border-primary ring-[3px] ring-ring/50",
				)}
				style={{ backgroundColor: value ?? "#ffffff" }}
			>
				<input
					type="color"
					value={value ?? "#ffffff"}
					onChange={(e) => onChange(e.target.value)}
					aria-label="Background color"
					className="absolute inset-0 size-full cursor-pointer opacity-0"
				/>
			</label>
		</div>
	);
}
