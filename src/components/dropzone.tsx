import { PlusIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function Dropzone({
	onFiles,
	hint = "or click to browse — images, video, audio, GIFs, archives",
	label = "Drop files here",
	accept,
	multiple = true,
	className,
}: {
	onFiles: (files: Array<File>) => void;
	hint?: string;
	label?: string;
	accept?: string;
	multiple?: boolean;
	className?: string;
}) {
	const [dragging, setDragging] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	return (
		<button
			type="button"
			onClick={() => inputRef.current?.click()}
			onDragOver={(e) => {
				e.preventDefault();
				setDragging(true);
			}}
			onDragLeave={() => setDragging(false)}
			onDrop={(e) => {
				e.preventDefault();
				setDragging(false);
				onFiles(Array.from(e.dataTransfer.files));
			}}
			className={cn(
				"flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-14 transition-colors",
				dragging
					? "border-primary bg-muted"
					: "border-border bg-card hover:border-primary/60",
				className,
			)}
		>
			<span className="flex items-center gap-2 font-mono text-sm font-semibold uppercase tracking-[0.25em]">
				<PlusIcon weight="bold" className="size-4" />
				{label}
			</span>
			<span className="text-sm text-muted-foreground">{hint}</span>
			<input
				ref={inputRef}
				type="file"
				accept={accept}
				multiple={multiple}
				className="sr-only"
				tabIndex={-1}
				onClick={(e) => e.stopPropagation()}
				onChange={(e) => {
					onFiles(Array.from(e.currentTarget.files ?? []));
					e.currentTarget.value = "";
				}}
			/>
		</button>
	);
}
