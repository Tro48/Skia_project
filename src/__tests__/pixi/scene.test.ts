import * as PIXI from "pixi.js-legacy";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createExampleScene, createPixiApp, populateScene } from "../../pixi/scene";

vi.mock("pixi.js-legacy", () => ({
	Application: vi.fn().mockImplementation(function (this: any) {
		this.view = document.createElement("canvas");
		this.stage = { addChild: vi.fn() };
	}),
	Container: vi.fn().mockImplementation(function (this: any) {
		this.removeChildren = vi.fn();
		this.addChild = vi.fn();
		this.children = [];
		this.position = { set: vi.fn() };
	}),
	Graphics: vi.fn().mockImplementation(function (this: any) {
		this.lineStyle = vi.fn().mockReturnThis();
		this.beginFill = vi.fn().mockReturnThis();
		this.endFill = vi.fn().mockReturnThis();
		this.drawRect = vi.fn().mockReturnThis();
		this.drawCircle = vi.fn().mockReturnThis();
		this.drawEllipse = vi.fn().mockReturnThis();
		this.drawShape = vi.fn().mockReturnThis();
		this.moveTo = vi.fn().mockReturnThis();
		this.lineTo = vi.fn().mockReturnThis();
		this.closePath = vi.fn().mockReturnThis();
		this.on = vi.fn().mockReturnThis();
		this.x = 0;
		this.y = 0;
		this.rotation = 0;
		this.angle = 0;
		this.scale = { set: vi.fn() };
		this.position = { set: vi.fn() };
		this.interactive = false;
		this.cursor = "";
	}),
	Sprite: vi.fn().mockImplementation(function (this: any) {
		this.on = vi.fn().mockReturnThis();
		this.position = { set: vi.fn() };
		this.anchor = { set: vi.fn() };
		this.interactive = false;
		this.cursor = "";
	}),
	Texture: vi.fn().mockImplementation(function (this: any) {}),
	BaseTexture: { from: vi.fn().mockReturnValue({}) },
	Ellipse: vi.fn().mockImplementation(function (this: any, x: number, y: number, w: number, h: number) {
		this.x = x; this.y = y; this.width = w; this.height = h;
	}),
}));

function makeCanvas(w = 400, h = 300): HTMLCanvasElement {
	const c = document.createElement("canvas");
	c.width = w;
	c.height = h;
	return c;
}

describe("createPixiApp", () => {
	it("передаёт canvas в PIXI.Application как view", () => {
		const canvas = makeCanvas();
		createPixiApp(canvas);
		expect(vi.mocked(PIXI.Application)).toHaveBeenCalledWith(
			expect.objectContaining({ view: canvas })
		);
	});

	it("возвращает объект с app и container", () => {
		const { app, container } = createPixiApp(makeCanvas());
		expect(app).toBeDefined();
		expect(container).toBeDefined();
	});

	it("создаёт Application с forceCanvas: true", () => {
		createPixiApp(makeCanvas());
		expect(vi.mocked(PIXI.Application)).toHaveBeenCalledWith(
			expect.objectContaining({ forceCanvas: true })
		);
	});

	it("читает размеры из canvas: width и height", () => {
		createPixiApp(makeCanvas(400, 300));
		expect(vi.mocked(PIXI.Application)).toHaveBeenCalledWith(
			expect.objectContaining({ width: 400, height: 300 })
		);
	});
});

describe("populateScene", () => {
	const makeContainer = () =>
		({
			removeChildren: vi.fn(),
			addChild: vi.fn(),
			children: [],
		}) as unknown as PIXI.Container;

	it("очищает существующих потомков перед добавлением", () => {
		const container = makeContainer();
		populateScene(container);
		expect(vi.mocked(container.removeChildren)).toHaveBeenCalledOnce();
	});

	it("добавляет от 4 до 8 фигур", () => {
		const container = makeContainer();
		populateScene(container);
		const count = vi.mocked(container.addChild).mock.calls.length;
		expect(count).toBeGreaterThanOrEqual(4);
		expect(count).toBeLessThanOrEqual(8);
	});

	it("каждая фигура является экземпляром PIXI.Graphics", () => {
		const container = makeContainer();
		populateScene(container);
		const MockGraphics = vi.mocked(PIXI.Graphics);
		const addedArgs = vi.mocked(container.addChild).mock.calls.map(([arg]) => arg);
		addedArgs.forEach((shape) => {
			expect(MockGraphics.mock.results.map((r) => r.value)).toContain(shape);
		});
	});

	it("каждая фигура имеет interactive=true", () => {
		const container = makeContainer();
		populateScene(container);
		const MockGraphics = vi.mocked(PIXI.Graphics);
		const shapes = MockGraphics.mock.results.map((r) => r.value);
		shapes.forEach((shape) => {
			expect(shape.interactive).toBe(true);
		});
	});
});

describe("createExampleScene", () => {
	// jsdom не реализует getContext('2d') — мокаем чтобы createCanvasSprite не падал
	const mockCtx2d = {
		fillStyle: "",
		font: "",
		textAlign: "",
		textBaseline: "",
		fillRect: vi.fn(),
		beginPath: vi.fn(),
		roundRect: vi.fn(),
		fill: vi.fn(),
		fillText: vi.fn(),
	};
	beforeEach(() => {
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(mockCtx2d as any);
	});

	const makeContainer = () =>
		({
			removeChildren: vi.fn(),
			addChild: vi.fn(),
			children: [],
		}) as unknown as PIXI.Container;

	it("очищает контейнер перед заполнением", () => {
		const container = makeContainer();
		createExampleScene(container);
		expect(vi.mocked(container.removeChildren)).toHaveBeenCalledOnce();
	});

	it("добавляет subContainer, g1, g2 и sprite в контейнер (4 потомка)", () => {
		const container = makeContainer();
		createExampleScene(container);
		// addChild вызывается один раз с 4 аргументами: subContainer, g1, g2, sprite
		expect(vi.mocked(container.addChild)).toHaveBeenCalledOnce();
		const args = vi.mocked(container.addChild).mock.calls[0];
		expect(args).toHaveLength(4);
	});

	it("g1 использует drawShape для рисования эллипса", () => {
		const container = makeContainer();
		createExampleScene(container);
		const MockGraphics = vi.mocked(PIXI.Graphics);
		const shapes = MockGraphics.mock.results.map((r) => r.value);
		const drawShapeCalls = shapes.flatMap((s) => s.drawShape?.mock?.calls ?? []);
		expect(drawShapeCalls.length).toBeGreaterThanOrEqual(1);
		// Первый аргумент — экземпляр PIXI.Ellipse
		const MockEllipse = vi.mocked(PIXI.Ellipse);
		expect(MockEllipse).toHaveBeenCalled();
	});

	it("g1 и g2 имеют interactive=true", () => {
		const container = makeContainer();
		createExampleScene(container);
		const MockGraphics = vi.mocked(PIXI.Graphics);
		const shapes = MockGraphics.mock.results.map((r) => r.value);
		// g1 и g2 — первые два Graphics с interactive
		const interactive = shapes.filter((s) => s.interactive);
		expect(interactive.length).toBeGreaterThanOrEqual(2);
	});

	it("g1 подписывается на pointerdown, g2 — на pointerup", () => {
		const container = makeContainer();
		createExampleScene(container);
		const MockGraphics = vi.mocked(PIXI.Graphics);
		const shapes = MockGraphics.mock.results.map((r) => r.value);
		const events = shapes.flatMap((s) => s.on.mock.calls.map(([ev]: [string]) => ev));
		expect(events).toContain("pointerdown");
		expect(events).toContain("pointerup");
	});
});
