import { describe, expect, it, vi } from "vitest";
import { renderContainerToSkia } from "../../skia/renderer";

vi.mock("../../skia/renderer.utils", () => ({
	renderDisplayObject: vi.fn(),
}));

vi.mock("pixi.js-legacy", () => ({
	Container: vi.fn(),
	Graphics: vi.fn(),
	Sprite: vi.fn(),
}));

// BG_COLOR из renderer.ts: { r: 0xf6/255, g: 0xf6/255, b: 0xf6/255, a: 1 } — светло-серый #f6f6f6
const BG_R = 0xf6 / 255;
const BG_G = 0xf6 / 255;
const BG_B = 0xf6 / 255;

function makePaint() {
	return {
		setColor: vi.fn(),
		setStyle: vi.fn(),
		delete: vi.fn(),
	};
}

function makeCk() {
	return {
		Paint: vi.fn().mockImplementation(makePaint),
		PaintStyle: { Fill: 0, Stroke: 1 },
		Color4f: vi
			.fn()
			.mockImplementation((r: number, g: number, b: number, a: number) => [r, g, b, a]),
		LTRBRect: vi.fn().mockReturnValue(new Float32Array(4)),
	};
}

function makeCanvas() {
	return {
		drawRect: vi.fn(),
		save: vi.fn(),
		restore: vi.fn(),
		concat: vi.fn(),
		clear: vi.fn(),
	};
}

function makeContainer() {
	return {
		visible: true,
		worldAlpha: 1,
		children: [],
		x: 0,
		y: 0,
		rotation: 0,
		scale: { x: 1, y: 1 },
		pivot: { x: 0, y: 0 },
	};
}

describe("renderContainerToSkia — фон", () => {
	it("рисует фоновый прямоугольник один раз", () => {
		const ck = makeCk();
		const canvas = makeCanvas();
		renderContainerToSkia({
			ck: ck as any,
			canvas: canvas as any,
			container: makeContainer() as any,
			width: 400,
			height: 300,
		});
		expect(canvas.drawRect).toHaveBeenCalledOnce();
	});

	it("передаёт ck.LTRBRect(0, 0, width, height) как область фона", () => {
		const ck = makeCk();
		const canvas = makeCanvas();
		renderContainerToSkia({
			ck: ck as any,
			canvas: canvas as any,
			container: makeContainer() as any,
			width: 400,
			height: 300,
		});
		expect(ck.LTRBRect).toHaveBeenCalledWith(0, 0, 400, 300);
	});

	it("использует разные size: width=200 height=150", () => {
		const ck = makeCk();
		const canvas = makeCanvas();
		renderContainerToSkia({
			ck: ck as any,
			canvas: canvas as any,
			container: makeContainer() as any,
			width: 200,
			height: 150,
		});
		expect(ck.LTRBRect).toHaveBeenCalledWith(0, 0, 200, 150);
	});

	it("цвет фона r≈0xf6/255, g≈0xf6/255, b≈0xf6/255, a=1 (#f6f6f6)", () => {
		const ck = makeCk();
		const canvas = makeCanvas();
		renderContainerToSkia({
			ck: ck as any,
			canvas: canvas as any,
			container: makeContainer() as any,
			width: 400,
			height: 300,
		});
		expect(ck.Color4f).toHaveBeenCalledWith(
			expect.closeTo(BG_R, 5),
			expect.closeTo(BG_G, 5),
			expect.closeTo(BG_B, 5),
			1
		);
	});

	it("фоновый paint имеет стиль Fill", () => {
		const ck = makeCk();
		const canvas = makeCanvas();
		renderContainerToSkia({
			ck: ck as any,
			canvas: canvas as any,
			container: makeContainer() as any,
			width: 400,
			height: 300,
		});
		const paint = (ck.Paint as ReturnType<typeof vi.fn>).mock.results[0].value;
		expect(paint.setStyle).toHaveBeenCalledWith(ck.PaintStyle.Fill);
	});

	it("bgPaint.delete() вызван после drawRect (освобождение WASM-памяти)", () => {
		const ck = makeCk();
		const canvas = makeCanvas();
		const order: string[] = [];
		const paint = makePaint();
		paint.delete.mockImplementation(() => order.push("delete"));
		(canvas.drawRect as ReturnType<typeof vi.fn>).mockImplementation(() =>
			order.push("drawRect")
		);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(ck.Paint as ReturnType<typeof vi.fn>).mockImplementation(function (this: any) {
			return paint;
		});

		renderContainerToSkia({
			ck: ck as any,
			canvas: canvas as any,
			container: makeContainer() as any,
			width: 400,
			height: 300,
		});

		expect(order).toEqual(["drawRect", "delete"]);
	});
});

describe("renderContainerToSkia — renderDisplayObject", () => {
	it("вызывает renderDisplayObject с переданным container", async () => {
		const { renderDisplayObject } = await import("../../skia/renderer.utils");
		const ck = makeCk();
		const canvas = makeCanvas();
		const container = makeContainer();

		renderContainerToSkia({
			ck: ck as any,
			canvas: canvas as any,
			container: container as any,
			width: 400,
			height: 300,
		});

		expect(renderDisplayObject).toHaveBeenCalledWith(
			expect.objectContaining({ ck: ck, canvas: canvas, obj: container })
		);
	});

	it("renderDisplayObject получает тот же ck и canvas, что и renderContainerToSkia", async () => {
		const { renderDisplayObject } = await import("../../skia/renderer.utils");
		const ck = makeCk();
		const canvas = makeCanvas();

		renderContainerToSkia({
			ck: ck as any,
			canvas: canvas as any,
			container: makeContainer() as any,
			width: 400,
			height: 300,
		});

		const call = (renderDisplayObject as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0];
		expect(call.ck).toBe(ck);
		expect(call.canvas).toBe(canvas);
	});
});
