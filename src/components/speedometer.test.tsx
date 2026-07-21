// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Speedometer } from "./speedometer";

afterEach(cleanup);

describe("Speedometer", () => {
	it("keeps fixed gauge geometry while progress changes", () => {
		const { getByTestId, rerender } = render(
			<Speedometer value={99} label="Download" active />,
		);
		const progress = getByTestId("speedometer-progress");
		const initialPath = progress.getAttribute("d");
		const initialOffset = Number(progress.getAttribute("stroke-dashoffset"));

		rerender(<Speedometer value={101} label="Download" active />);

		expect(progress.getAttribute("d")).toBe(initialPath);
		expect(Number(progress.getAttribute("stroke-dashoffset"))).toBeLessThan(
			initialOffset,
		);
	});

	it("rotates the needle around the hub", () => {
		const { getByTestId, rerender } = render(
			<Speedometer value={10} label="Upload" active />,
		);
		const needle = getByTestId("speedometer-needle");
		const initialTransform = needle.style.transform;

		rerender(<Speedometer value={1_000} label="Upload" active />);

		expect(needle.style.transformOrigin).toBe("160px 160px");
		expect(needle.style.transform).not.toBe(initialTransform);
		expect(needle.style.transform).toMatch(/^rotate\(.+deg\)$/);
	});
});
