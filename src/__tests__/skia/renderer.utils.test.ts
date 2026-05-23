import * as PIXI from "pixi.js-legacy";
import { describe, expect, it, vi } from "vitest";
import { renderDisplayObject } from "../../skia/renderer.utils";

// Классы вместо vi.fn() — чтобы instanceof работал через prototype chain
vi.mock("pixi.js-legacy", () => {
	class Container {
		visible = true;
		worldAlpha = 1;
		x = 0;
		y = 0;
		rotation = 0;
		scale = { x: 1, y: 1 };
		pivot = { x: 0, y: 0 };
		transform = {};
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		children: any[] = [];
	}
	class Graphics extends Container {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		geometry = { graphicsData: [] as any[] };
	}
	class Sprite extends Container {
		anchor = { x: 0, y: 0 };
		texture = {
			width: 4,
			height: 4,
			orig: { width: 4, height: 4 },
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			baseTexture: { resource: null as any },
		};
	}
	class Rectangle {
		constructor(
			public x = 0,
			public y = 0,
			public width = 10,
			public height = 10
		) {}
	}
	class Circle {
		constructor(
			public x = 0,
			public y = 0,
			public radius = 10
		) {}
	}
	class Polygon {
		constructor(public points: number[] = []) {}
	}
	class Ellipse {
		constructor(
			public x = 0,
			public y = 0,
			public width = 10,
			public height = 6
		) {}
	}
	return { Container, Graphics, Sprite, Rectangle, Circle, Polygon, Ellipse };
});

// ---- фабрики моков ----

function makeCanvas() {
	return {
		save: vi.fn(),
		restore: vi.fn(),
		concat: vi.fn(),
		drawPath: vi.fn(),
		drawImage: vi.fn(),
	};
}

function makePaint() {
	return {
		setStyle: vi.fn(),
		setColor: vi.fn(),
		setAntiAlias: vi.fn(),
		setStrokeWidth: vi.fn(),
		setAlphaf: vi.fn(),
		delete: vi.fn(),
	};
}

function makePathBuilder() {
	const detachedPath = { delete: vi.fn() };
	return {
		addRect: vi.fn().mockReturnThis(),
		addCircle: vi.fn().mockReturnThis(),
		addOval: vi.fn().mockReturnThis(),
		moveTo: vi.fn().mockReturnThis(),
		lineTo: vi.fn().mockReturnThis(),
		close: vi.fn().mockReturnThis(),
		detach: vi.fn().mockReturnValue(detachedPath),
		delete: vi.fn(),
		_path: detachedPath,
	};
}

function makeCk() {
	return {
		PathBuilder: vi.fn().mockImplementation(makePathBuilder),
		Paint: vi.fn().mockImplementation(makePaint),
		PaintStyle: { Fill: 0, Stroke: 1 },
		Color4f: vi
			.fn()
			.mockImplementation(
				(r: number, g: number, b: number, a: number) => new Float32Array([r, g, b, a])
			),
		LTRBRect: vi.fn().mockReturnValue(new Float32Array(4)),
		AlphaType: { Premul: 0 },
		ColorType: { RGBA_8888: 0 },
		ColorSpace: { SRGB: {} },
		MakeImage: vi.fn().mockReturnValue({ delete: vi.fn() }),
	};
}

// Возвращает один элемент graphicsData с заданной формой и видимостью стилей
function gfxData(
	shape: unknown,
	{ fill = true, stroke = true }: { fill?: boolean; stroke?: boolean } = {}
) {
	return {
		shape,
		fillStyle: { visible: fill, color: 0xff0000, alpha: 0.8 },
		lineStyle: { visible: stroke, color: 0x00ff00, alpha: 1, width: 2 },
	};
}

// Создаёт Graphics с одной фигурой и прогоняет через renderDisplayObject
function renderShape(shape: unknown, opts: { fill?: boolean; stroke?: boolean } = {}) {
	const canvas = makeCanvas();
	const ck = makeCk();
	const g = new PIXI.Graphics() as any;
	g.geometry.graphicsData = [gfxData(shape, opts)];
	renderDisplayObject({ ck: ck as any, canvas: canvas as any, obj: g });
	// первый PathBuilder, созданный внутри buildPath
	const pb = (ck.PathBuilder as ReturnType<typeof vi.fn>).mock.results[0]?.value;
	return { canvas, ck, pb };
}

// ---- тесты ----

describe("renderDisplayObject — ранний выход", () => {
	it("пропускает объект с visible=false", () => {
		const canvas = makeCanvas();
		const obj = Object.assign(new PIXI.Container(), { visible: false });
		renderDisplayObject({ ck: makeCk() as any, canvas: canvas as any, obj: obj as any });
		expect(canvas.save).not.toHaveBeenCalled();
	});

	it("пропускает объект с worldAlpha=0", () => {
		const canvas = makeCanvas();
		const obj = Object.assign(new PIXI.Container(), { worldAlpha: 0 });
		renderDisplayObject({ ck: makeCk() as any, canvas: canvas as any, obj: obj as any });
		expect(canvas.save).not.toHaveBeenCalled();
	});

	it("пропускает объект с worldAlpha < 0", () => {
		const canvas = makeCanvas();
		const obj = Object.assign(new PIXI.Container(), { worldAlpha: -0.1 });
		renderDisplayObject({ ck: makeCk() as any, canvas: canvas as any, obj: obj as any });
		expect(canvas.save).not.toHaveBeenCalled();
	});
});

describe("renderDisplayObject — save/restore", () => {
	it("вызывает save() и restore() ровно по одному разу для одного объекта", () => {
		const canvas = makeCanvas();
		const obj = new PIXI.Container();
		renderDisplayObject({ ck: makeCk() as any, canvas: canvas as any, obj: obj as any });
		expect(canvas.save).toHaveBeenCalledOnce();
		expect(canvas.restore).toHaveBeenCalledOnce();
	});

	it("restore() всегда вызывается после save() — порядок важен", () => {
		const canvas = makeCanvas();
		const order: string[] = [];
		canvas.save.mockImplementation(() => order.push("save"));
		canvas.restore.mockImplementation(() => order.push("restore"));
		const obj = new PIXI.Container();
		renderDisplayObject({ ck: makeCk() as any, canvas: canvas as any, obj: obj as any });
		expect(order).toEqual(["save", "restore"]);
	});

	it("вызывает save/restore для каждого дочернего элемента", () => {
		const canvas = makeCanvas();
		const parent = new PIXI.Container() as any;
		const child = new PIXI.Container() as any;
		parent.children = [child];
		renderDisplayObject({ ck: makeCk() as any, canvas: canvas as any, obj: parent });
		expect(canvas.save).toHaveBeenCalledTimes(2);
		expect(canvas.restore).toHaveBeenCalledTimes(2);
	});
});

describe("applyTransform", () => {
	it("вызывает canvas.concat с массивом из 9 чисел", () => {
		const canvas = makeCanvas();
		const obj = new PIXI.Container();
		renderDisplayObject({ ck: makeCk() as any, canvas: canvas as any, obj: obj as any });
		expect(canvas.concat).toHaveBeenCalledOnce();
		const matrix = canvas.concat.mock.calls[0][0];
		expect(Array.isArray(matrix)).toBe(true);
		expect(matrix).toHaveLength(9);
	});

	it("identity-трансформация → матрица [1,0,0, 0,1,0, 0,0,1]", () => {
		const canvas = makeCanvas();
		const obj = Object.assign(new PIXI.Container(), {
			x: 0,
			y: 0,
			rotation: 0,
			scale: { x: 1, y: 1 },
			pivot: { x: 0, y: 0 },
		});
		renderDisplayObject({ ck: makeCk() as any, canvas: canvas as any, obj: obj as any });
		const [a, c, tx, b, d, ty] = canvas.concat.mock.calls[0][0] as number[];
		expect(a).toBeCloseTo(1);
		expect(c).toBeCloseTo(0);
		expect(tx).toBeCloseTo(0);
		expect(b).toBeCloseTo(0);
		expect(d).toBeCloseTo(1);
		expect(ty).toBeCloseTo(0);
	});

	it("translation x=50, y=30 → tx=50, ty=30 в матрице", () => {
		const canvas = makeCanvas();
		const obj = Object.assign(new PIXI.Container(), {
			x: 50,
			y: 30,
			rotation: 0,
			scale: { x: 1, y: 1 },
			pivot: { x: 0, y: 0 },
		});
		renderDisplayObject({ ck: makeCk() as any, canvas: canvas as any, obj: obj as any });
		const [, , tx, , , ty] = canvas.concat.mock.calls[0][0] as number[];
		expect(tx).toBeCloseTo(50);
		expect(ty).toBeCloseTo(30);
	});

	it("rotation=PI/2 → a≈0, b≈1, c≈-1, d≈0", () => {
		const canvas = makeCanvas();
		const obj = Object.assign(new PIXI.Container(), {
			x: 0,
			y: 0,
			rotation: Math.PI / 2,
			scale: { x: 1, y: 1 },
			pivot: { x: 0, y: 0 },
		});
		renderDisplayObject({ ck: makeCk() as any, canvas: canvas as any, obj: obj as any });
		const [a, c, , b, d] = canvas.concat.mock.calls[0][0] as number[];
		expect(a).toBeCloseTo(0);
		expect(c).toBeCloseTo(-1);
		expect(b).toBeCloseTo(1);
		expect(d).toBeCloseTo(0);
	});
});

describe("buildPath", () => {
	it("Rectangle → PathBuilder.addRect вызван с правильным rect", () => {
		const { pb, ck } = renderShape(new PIXI.Rectangle(5, 10, 40, 20));
		expect(pb.addRect).toHaveBeenCalledOnce();
		// LTRBRect(5, 10, 45, 30)
		expect(ck.LTRBRect).toHaveBeenCalledWith(5, 10, 45, 30);
	});

	it("Circle → PathBuilder.addCircle с координатами и радиусом", () => {
		const { pb } = renderShape(new PIXI.Circle(3, 7, 15));
		expect(pb.addCircle).toHaveBeenCalledOnce();
		expect(pb.addCircle).toHaveBeenCalledWith(3, 7, 15);
	});

	it("Polygon (4+ точки) → moveTo + lineTo×(n-1) + close + detach", () => {
		const { pb } = renderShape(new PIXI.Polygon([0, 0, 10, 0, 10, 10, 0, 10]));
		expect(pb.moveTo).toHaveBeenCalledWith(0, 0);
		expect(pb.lineTo).toHaveBeenCalledTimes(3);
		expect(pb.close).toHaveBeenCalledOnce();
		expect(pb.detach).toHaveBeenCalledOnce();
	});

	it("Polygon с < 4 числами → builder.delete(), drawPath не вызван", () => {
		const { canvas, pb } = renderShape(new PIXI.Polygon([0, 0]));
		expect(pb.delete).toHaveBeenCalledOnce();
		expect(canvas.drawPath).not.toHaveBeenCalled();
	});

	it("Ellipse → PathBuilder.addOval вызван один раз", () => {
		const { pb } = renderShape(new PIXI.Ellipse(0, 0, 20, 10));
		expect(pb.addOval).toHaveBeenCalledOnce();
	});

	it("неизвестная фигура → builder.delete(), drawPath не вызван", () => {
		const { canvas, pb } = renderShape({ unknownShape: true });
		expect(pb.delete).toHaveBeenCalledOnce();
		expect(canvas.drawPath).not.toHaveBeenCalled();
	});
});

describe("renderGraphics", () => {
	it("fill + stroke → drawPath вызван дважды", () => {
		const { canvas } = renderShape(new PIXI.Rectangle());
		expect(canvas.drawPath).toHaveBeenCalledTimes(2);
	});

	it("только fill → drawPath вызван один раз", () => {
		const { canvas } = renderShape(new PIXI.Rectangle(), { stroke: false });
		expect(canvas.drawPath).toHaveBeenCalledOnce();
	});

	it("только stroke → drawPath вызван один раз", () => {
		const { canvas } = renderShape(new PIXI.Rectangle(), { fill: false });
		expect(canvas.drawPath).toHaveBeenCalledOnce();
	});

	it("fill=false stroke=false → drawPath не вызван", () => {
		const { canvas } = renderShape(new PIXI.Rectangle(), { fill: false, stroke: false });
		expect(canvas.drawPath).not.toHaveBeenCalled();
	});

	it("paint.delete() вызван для каждого Paint (освобождение WASM-памяти)", () => {
		const { ck } = renderShape(new PIXI.Rectangle());
		const paints = (ck.Paint as ReturnType<typeof vi.fn>).mock.results.map((r) => r.value);
		paints.forEach((p) => expect(p.delete).toHaveBeenCalled());
	});

	it("path.delete() вызван после отрисовки (освобождение WASM-памяти)", () => {
		const { pb } = renderShape(new PIXI.Rectangle());
		expect(pb._path.delete).toHaveBeenCalledOnce();
	});
});

describe("hexToSkiaColor", () => {
	it("0xff0000 конвертируется в r=1, g=0, b=0", () => {
		const canvas = makeCanvas();
		const ck = makeCk();
		const g = new PIXI.Graphics() as any;
		g.geometry.graphicsData = [gfxData(new PIXI.Rectangle(), { stroke: false })];
		g.geometry.graphicsData[0].fillStyle.color = 0xff0000;
		renderDisplayObject({ ck: ck as any, canvas: canvas as any, obj: g });
		const [r, gr, b] = (ck.Color4f as ReturnType<typeof vi.fn>).mock.calls[0];
		expect(r).toBeCloseTo(1);
		expect(gr).toBeCloseTo(0);
		expect(b).toBeCloseTo(0);
	});

	it("alpha = worldAlpha × fillStyle.alpha", () => {
		const canvas = makeCanvas();
		const ck = makeCk();
		const g = new PIXI.Graphics() as any;
		g.worldAlpha = 0.5;
		g.geometry.graphicsData = [gfxData(new PIXI.Rectangle(), { stroke: false })];
		g.geometry.graphicsData[0].fillStyle.alpha = 0.4;
		renderDisplayObject({ ck: ck as any, canvas: canvas as any, obj: g });
		const alpha = (ck.Color4f as ReturnType<typeof vi.fn>).mock.calls[0][3];
		expect(alpha).toBeCloseTo(0.2); // 0.5 × 0.4
	});
});

describe("renderSprite", () => {
	// jsdom не реализует canvas.getContext() — мокаем на уровне прототипа
	const mockCtx = {
		drawImage: vi.fn(),
		getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(64) }),
	};

	function setupSprite(worldAlpha = 1, w = 4, h = 4) {
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(mockCtx as any);
		const canvas = makeCanvas();
		const ck = makeCk();
		const sprite = new PIXI.Sprite() as any;
		sprite.worldAlpha = worldAlpha;
		sprite.texture.width = w;
		sprite.texture.height = h;
		sprite.texture.orig = { width: w, height: h };
		const imgCanvas = document.createElement("canvas");
		sprite.texture.baseTexture.resource = { source: imgCanvas };
		return { canvas, ck, sprite };
	}

	it("вызывает canvas.drawImage когда source доступен", () => {
		const { canvas, ck, sprite } = setupSprite();
		renderDisplayObject({ ck: ck as any, canvas: canvas as any, obj: sprite });
		expect(canvas.drawImage).toHaveBeenCalledOnce();
	});

	it("не вызывает canvas.drawImage когда source равен null", () => {
		const canvas = makeCanvas();
		const sprite = new PIXI.Sprite() as any;
		sprite.texture.baseTexture.resource = null;
		renderDisplayObject({ ck: makeCk() as any, canvas: canvas as any, obj: sprite });
		expect(canvas.drawImage).not.toHaveBeenCalled();
	});

	it("вызывает ck.MakeImage с правильными размерами текстуры", () => {
		const { canvas, ck, sprite } = setupSprite(1, 4, 4);
		renderDisplayObject({ ck: ck as any, canvas: canvas as any, obj: sprite });
		expect(ck.MakeImage).toHaveBeenCalledWith(
			expect.objectContaining({ width: 4, height: 4 }),
			expect.anything(),
			16 // 4 байта × ширина
		);
	});

	it("применяет worldAlpha через paint.setAlphaf", () => {
		const { canvas, ck, sprite } = setupSprite(0.7);
		renderDisplayObject({ ck: ck as any, canvas: canvas as any, obj: sprite });
		const paint = (ck.Paint as ReturnType<typeof vi.fn>).mock.results[0].value;
		expect(paint.setAlphaf).toHaveBeenCalledWith(0.7);
	});
});
