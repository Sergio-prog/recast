import { ImageSquareIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { CHECKERBOARD } from "@/components/background-picker";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	BACKGROUND_CUSTOM,
	BACKGROUND_NONE,
	BACKGROUND_PRESETS,
	type Background,
	getPresetThumb,
} from "@/lib/code-image/backgrounds";
import { LANGUAGES, THEME_FAMILIES } from "@/lib/code-image/highlight";
import {
	CODE_FONTS,
	type CodeFontId,
	codeFontFamily,
	DEFAULT_SETTINGS,
	getCodeFont,
	LIMITS,
	PADDINGS,
	RATIOS,
	type Settings,
	WINDOW_STYLES,
} from "@/lib/code-image/model";
import { cn } from "@/lib/utils";
import {
	ResetButton,
	RollingNumber,
	Row,
	ScrubSlider,
	Section,
	Segmented,
	SwitchRow,
} from "./controls";

const TILE =
	"relative aspect-square overflow-hidden rounded-lg outline-none transition-[scale,box-shadow] duration-200 ease-out-expo hover:scale-[1.04] active:scale-[0.97] focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:hover:scale-100";
const TILE_SELECTED =
	"shadow-[0_0_0_2px_var(--color-background),0_0_0_4px_var(--color-foreground)]";
const TILE_IDLE = "shadow-[inset_0_0_0_1px_rgba(128,128,128,0.25)]";

const SWATCH_DOTS = ["keyword", "string", "function"] as const;

const px = (value: number) => `${value}px`;
const pxFixed = (value: number) => `${value.toFixed(1)}px`;
const percent = (value: number) => `${value}%`;

type InspectorProps = {
	settings: Settings;
	customBackground: Background | null;
	onSmooth: (patch: Partial<Settings>) => void;
	onInstant: (patch: Partial<Settings>) => void;
	onImage: (file: File) => void;
};

export function Inspector({
	settings,
	customBackground,
	onSmooth,
	onInstant,
	onImage,
}: InspectorProps) {
	return (
		<div>
			<BackgroundSection
				settings={settings}
				customBackground={customBackground}
				onSmooth={onSmooth}
				onImage={onImage}
			/>
			<ThemeSection settings={settings} onSmooth={onSmooth} />
			<Section title="Window">
				<Segmented
					label="Window style"
					value={settings.windowStyle}
					onChange={(windowStyle) => onSmooth({ windowStyle })}
					options={WINDOW_STYLES.map((style) => ({
						value: style.id,
						label: style.label,
					}))}
				/>
				<Row label="Width">
					<span className="relative flex items-center text-xs">
						<span
							className={cn(
								"flex transition-transform duration-300 ease-out-expo motion-reduce:transition-none",
								settings.windowWidth !== null && "-translate-x-6",
							)}
						>
							<RollingNumber
								text={
									settings.windowWidth === null
										? "Auto"
										: px(settings.windowWidth)
								}
							/>
						</span>
						<ResetButton
							visible={settings.windowWidth !== null}
							label="Reset width to auto"
							onReset={() => onSmooth({ windowWidth: null })}
							className="absolute right-0"
						/>
					</span>
				</Row>
				<ScrubSlider
					label="Opacity"
					value={settings.opacity}
					{...LIMITS.opacity}
					defaultValue={DEFAULT_SETTINGS.opacity}
					format={percent}
					onChange={(opacity) => onInstant({ opacity })}
				/>
				<ScrubSlider
					label="Blur"
					value={settings.blur}
					{...LIMITS.blur}
					defaultValue={DEFAULT_SETTINGS.blur}
					format={px}
					onChange={(blur) => onInstant({ blur })}
				/>
				<ScrubSlider
					label="Corners"
					value={settings.radius}
					{...LIMITS.radius}
					defaultValue={DEFAULT_SETTINGS.radius}
					format={px}
					onChange={(radius) => onInstant({ radius })}
				/>
				<ScrubSlider
					label="Shadow"
					value={settings.shadow}
					{...LIMITS.shadow}
					defaultValue={DEFAULT_SETTINGS.shadow}
					format={percent}
					onChange={(shadow) => onInstant({ shadow })}
				/>
			</Section>
			<Section title="Code">
				<Row label="Language">
					<Select
						value={settings.language}
						onValueChange={(language) => {
							if (language) onSmooth({ language });
						}}
					>
						<SelectTrigger size="sm" className="w-40 text-xs">
							<SelectValue>
								{
									LANGUAGES.find((entry) => entry.id === settings.language)
										?.label
								}
							</SelectValue>
						</SelectTrigger>
						<SelectContent
							align="end"
							alignItemWithTrigger={false}
							className="max-h-[min(18rem,var(--available-height))] overscroll-contain [scrollbar-width:thin]"
						>
							{LANGUAGES.map((language) => (
								<SelectItem key={language.id} value={language.id}>
									{language.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Row>
				<Row label="Font">
					<Select
						value={settings.fontId}
						onValueChange={(fontId) => {
							if (fontId) onSmooth({ fontId: fontId as CodeFontId });
						}}
					>
						<SelectTrigger size="sm" className="w-40 text-xs">
							<SelectValue
								style={{ fontFamily: codeFontFamily(settings.fontId) }}
							>
								{getCodeFont(settings.fontId).label}
							</SelectValue>
						</SelectTrigger>
						<SelectContent align="end" alignItemWithTrigger={false}>
							{CODE_FONTS.map((font) => (
								<SelectItem
									key={font.id}
									value={font.id}
									style={{ fontFamily: codeFontFamily(font.id) }}
								>
									{font.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Row>
				<ScrubSlider
					label="Size"
					value={settings.fontSize}
					{...LIMITS.fontSize}
					defaultValue={DEFAULT_SETTINGS.fontSize}
					format={pxFixed}
					onChange={(fontSize) => onInstant({ fontSize })}
				/>
				<SwitchRow
					label="Line numbers"
					checked={settings.lineNumbers}
					onChange={(lineNumbers) => onSmooth({ lineNumbers })}
				/>
			</Section>
			<Section title="Canvas">
				<Segmented
					label="Aspect ratio"
					value={settings.ratioId}
					onChange={(ratioId) => onSmooth({ ratioId })}
					options={RATIOS.map((ratio) => ({
						value: ratio.id,
						label: ratio.label,
					}))}
				/>
				<Row label="Padding">
					<Segmented
						label="Padding"
						className="w-48"
						value={settings.padding}
						onChange={(padding) => onSmooth({ padding })}
						options={PADDINGS.map((padding) => ({
							value: padding,
							label: String(padding),
						}))}
					/>
				</Row>
			</Section>
		</div>
	);
}

function BackgroundSection({
	settings,
	customBackground,
	onSmooth,
	onImage,
}: Pick<
	InspectorProps,
	"settings" | "customBackground" | "onSmooth" | "onImage"
>) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [hovered, setHovered] = useState<string | null>(null);
	const labelOf = (id: string) => {
		if (id === BACKGROUND_NONE) return "Transparent";
		if (id === BACKGROUND_CUSTOM) return "Your image";
		return BACKGROUND_PRESETS.find((preset) => preset.id === id)?.label;
	};
	const selectedClass = (id: string) =>
		settings.backgroundId === id ? TILE_SELECTED : TILE_IDLE;

	return (
		<Section
			title="Background"
			value={labelOf(hovered ?? settings.backgroundId)}
		>
			<div className="grid grid-cols-5 gap-2">
				<button
					type="button"
					aria-label={
						customBackground ? "Use your image" : "Upload a background image"
					}
					aria-pressed={settings.backgroundId === BACKGROUND_CUSTOM}
					onMouseEnter={() => setHovered(BACKGROUND_CUSTOM)}
					onMouseLeave={() => setHovered(null)}
					onClick={() => {
						if (
							customBackground &&
							settings.backgroundId !== BACKGROUND_CUSTOM
						) {
							onSmooth({ backgroundId: BACKGROUND_CUSTOM });
						} else {
							inputRef.current?.click();
						}
					}}
					className={cn(
						TILE,
						"flex items-center justify-center bg-muted bg-cover bg-center text-muted-foreground hover:text-foreground",
						selectedClass(BACKGROUND_CUSTOM),
					)}
					style={
						customBackground
							? { backgroundImage: `url("${customBackground.url}")` }
							: undefined
					}
				>
					{!customBackground && <ImageSquareIcon className="size-4" />}
				</button>
				{BACKGROUND_PRESETS.map((preset) => (
					<button
						key={preset.id}
						type="button"
						aria-label={`${preset.label} background`}
						aria-pressed={settings.backgroundId === preset.id}
						onMouseEnter={() => setHovered(preset.id)}
						onMouseLeave={() => setHovered(null)}
						onClick={() => onSmooth({ backgroundId: preset.id })}
						className={cn(TILE, "bg-cover", selectedClass(preset.id))}
						style={{ backgroundImage: `url("${getPresetThumb(preset.id)}")` }}
					/>
				))}
				<button
					type="button"
					aria-label="Transparent background"
					aria-pressed={settings.backgroundId === BACKGROUND_NONE}
					onMouseEnter={() => setHovered(BACKGROUND_NONE)}
					onMouseLeave={() => setHovered(null)}
					onClick={() => onSmooth({ backgroundId: BACKGROUND_NONE })}
					className={cn(TILE, CHECKERBOARD, selectedClass(BACKGROUND_NONE))}
				/>
			</div>
			<input
				ref={inputRef}
				type="file"
				accept="image/*"
				className="sr-only"
				tabIndex={-1}
				onChange={(e) => {
					const file = e.currentTarget.files?.[0];
					if (file) onImage(file);
					e.currentTarget.value = "";
				}}
			/>
		</Section>
	);
}

function ThemeSection({
	settings,
	onSmooth,
}: Pick<InspectorProps, "settings" | "onSmooth">) {
	const [hovered, setHovered] = useState<string | null>(null);
	const labelOf = (id: string) =>
		THEME_FAMILIES.find((family) => family.id === id)?.label;

	return (
		<Section title="Theme" value={labelOf(hovered ?? settings.themeId)}>
			<Segmented
				label="Window appearance"
				value={settings.mode}
				onChange={(mode) => onSmooth({ mode })}
				options={[
					{
						value: "light",
						label: (
							<>
								<SunIcon /> Light
							</>
						),
					},
					{
						value: "dark",
						label: (
							<>
								<MoonIcon /> Dark
							</>
						),
					},
				]}
			/>
			<div className="grid grid-cols-4 gap-2">
				{THEME_FAMILIES.map((family) => {
					const swatch = family[settings.mode];
					const selected = settings.themeId === family.id;
					return (
						<button
							key={family.id}
							type="button"
							aria-label={`${family.label} theme`}
							aria-pressed={selected}
							onMouseEnter={() => setHovered(family.id)}
							onMouseLeave={() => setHovered(null)}
							onClick={() => onSmooth({ themeId: family.id })}
							className={cn(
								TILE,
								"flex aspect-auto h-9 items-center justify-center gap-1 transition-[scale,box-shadow,background-color] duration-300",
								selected ? TILE_SELECTED : TILE_IDLE,
							)}
							style={{ backgroundColor: swatch.bg }}
						>
							{SWATCH_DOTS.map((dot, index) => (
								<span
									key={dot}
									className="size-2 rounded-full transition-colors duration-300"
									style={{ backgroundColor: swatch.dots[index] }}
								/>
							))}
						</button>
					);
				})}
			</div>
		</Section>
	);
}
