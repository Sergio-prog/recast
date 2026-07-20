import { Highlight, Prism } from "prism-react-renderer";

const prismGlobal = globalThis as typeof globalThis & { Prism: typeof Prism };
prismGlobal.Prism = Prism;
// @ts-expect-error Prism's official grammar modules do not publish declarations.
await import("prismjs/components/prism-bash.js");

const LANGUAGE_ALIASES: Record<string, string> = {
	typescript: "typescript",
	javascript: "javascript",
	python: "python",
	json: "json",
	html: "markup",
	css: "css",
	sql: "sql",
	bash: "bash",
	rust: "rust",
	go: "go",
	yaml: "yaml",
};

const TOKEN_COLORS: Record<string, string> = {
	comment: "text-muted-foreground",
	prolog: "text-muted-foreground",
	doctype: "text-muted-foreground",
	cdata: "text-muted-foreground",
	punctuation: "text-foreground/70",
	property: "text-[color:var(--color-chart-1)]",
	tag: "text-[color:var(--color-destructive)]",
	boolean: "text-[color:var(--color-chart-5)]",
	number: "text-[color:var(--color-chart-5)]",
	constant: "text-[color:var(--color-chart-5)]",
	symbol: "text-[color:var(--color-chart-5)]",
	selector: "text-[color:var(--color-chart-2)]",
	"attr-name": "text-[color:var(--color-chart-2)]",
	string: "text-[color:var(--color-chart-2)]",
	char: "text-[color:var(--color-chart-2)]",
	builtin: "text-[color:var(--color-chart-2)]",
	inserted: "text-[color:var(--color-chart-2)]",
	operator: "text-[color:var(--color-chart-3)]",
	entity: "text-[color:var(--color-chart-3)]",
	url: "text-[color:var(--color-chart-3)]",
	variable: "text-[color:var(--color-chart-3)]",
	atrule: "text-[color:var(--color-chart-4)]",
	"attr-value": "text-[color:var(--color-chart-4)]",
	function: "text-[color:var(--color-chart-4)]",
	"class-name": "text-[color:var(--color-chart-4)]",
	keyword: "text-[color:var(--color-chart-1)]",
	regex: "text-[color:var(--color-chart-3)]",
	important: "text-[color:var(--color-chart-3)]",
};

type HighlightedCodeProps = {
	content: string;
	language: string;
};

export function PlainCode({ content }: Pick<HighlightedCodeProps, "content">) {
	return (
		<pre className="min-w-0 whitespace-pre p-4 font-mono text-sm leading-relaxed">
			{content}
		</pre>
	);
}

export function HighlightedCode({ content, language }: HighlightedCodeProps) {
	const prismLanguage = LANGUAGE_ALIASES[language.toLowerCase()];
	if (!prismLanguage || !Prism.languages[prismLanguage]) {
		return <PlainCode content={content} />;
	}

	return (
		<Highlight code={content} language={prismLanguage}>
			{({ tokens, getLineProps, getTokenProps }) => {
				let sourceOffset = 0;
				return (
					<pre className="min-w-0 whitespace-pre p-4 font-mono text-sm leading-relaxed">
						{tokens.map((line, lineIndex) => {
							const lineText = line.map((token) => token.content).join("");
							const lineOffset = sourceOffset;
							sourceOffset += lineText.length + 1;
							let tokenOffset = lineOffset;
							const repeatedTokens = new Map<string, number>();
							const lineProps = getLineProps({ line });
							return (
								<span
									key={`line-${lineOffset}-${lineText.length}`}
									className={lineProps.className}
								>
									{line.map((token) => {
										const tokenProps = getTokenProps({ token });
										const colorClass = token.types
											.map((type) => TOKEN_COLORS[type])
											.find(Boolean);
										const tokenStart = tokenOffset;
										tokenOffset += token.content.length;
										const tokenSignature = `${token.types.join(".")}:${token.content.length}`;
										const occurrence = repeatedTokens.get(tokenSignature) ?? 0;
										repeatedTokens.set(tokenSignature, occurrence + 1);
										return (
											<span
												key={`${tokenStart}:${tokenSignature}:${occurrence}`}
												className={[tokenProps.className, colorClass]
													.filter(Boolean)
													.join(" ")}
											>
												{tokenProps.children}
											</span>
										);
									})}
									{lineIndex < tokens.length - 1 ? "\n" : null}
								</span>
							);
						})}
					</pre>
				);
			}}
		</Highlight>
	);
}
