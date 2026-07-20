// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HighlightedCode } from "./highlighted-code";

describe("HighlightedCode", () => {
	it("renders HTML-like content as text without injecting elements", () => {
		const content = '<img src=x onerror="alert(1)">';
		const { container } = render(
			<HighlightedCode content={content} language="html" />,
		);

		expect(container.textContent).toBe(content);
		expect(container.querySelector("img")).toBeNull();
	});

	it("falls back to a plain pre for an unknown language", () => {
		const content = "some unchanged text";
		const { container } = render(
			<HighlightedCode content={content} language="unknown" />,
		);

		expect(container.querySelector("pre")?.textContent).toBe(content);
		expect(container.querySelector("pre span")).toBeNull();
	});

	it("keeps the text language plain", () => {
		const { container } = render(
			<HighlightedCode content="plain text" language="text" />,
		);

		expect(container.querySelector("pre span")).toBeNull();
	});

	it.each([
		["typescript", "const answer: number = 1;", "keyword"],
		["javascript", "const answer = true;", "keyword"],
		["python", "def answer():\n    return True", "keyword"],
		["json", '{"answer": true}', "property"],
		["html", "<main>answer</main>", "tag"],
		["css", ".answer { color: red; }", "selector"],
		["sql", "SELECT answer FROM results;", "keyword"],
		["bash", 'echo "$HOME"', "builtin"],
		["rust", "fn main() { let answer = true; }", "keyword"],
		["go", "func main() { answer := true }", "keyword"],
		["yaml", "answer: true", "key"],
	])("tokenizes the supported %s language", (language, content, tokenType) => {
		const { container } = render(
			<HighlightedCode content={content} language={language} />,
		);

		expect(container.querySelector("pre")?.textContent).toBe(content);
		expect(container.querySelector(`.token.${tokenType}`)).not.toBeNull();
	});
});
