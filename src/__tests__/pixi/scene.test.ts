import * as PIXI from "pixi.js-legacy";
import { describe, expect, it, vi } from "vitest";
import { createPixiApp, populateScene } from "../../pixi/scene";

vi.mock("pixi.js-legacy", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Application: vi.fn().mockImplementation(function (this: any) {
    this.view = document.createElement("canvas");
    this.stage = { addChild: vi.fn() };
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Container: vi.fn().mockImplementation(function (this: any) {
    this.removeChildren = vi.fn();
    this.addChild = vi.fn();
    this.children = [];
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Graphics: vi.fn().mockImplementation(function (this: any) {
    this.lineStyle = vi.fn().mockReturnThis();
    this.beginFill = vi.fn().mockReturnThis();
    this.endFill = vi.fn().mockReturnThis();
    this.drawRect = vi.fn().mockReturnThis();
    this.drawCircle = vi.fn().mockReturnThis();
    this.moveTo = vi.fn().mockReturnThis();
    this.lineTo = vi.fn().mockReturnThis();
    this.closePath = vi.fn().mockReturnThis();
    this.x = 0;
    this.y = 0;
    this.rotation = 0;
    this.scale = { set: vi.fn() };
  }),
}));

describe("createPixiApp", () => {
  it("вставляет canvas в переданный DOM-элемент", () => {
    const mountEl = document.createElement("div");
    createPixiApp(mountEl);
    expect(mountEl.children.length).toBe(1);
    expect(mountEl.firstChild).toBeInstanceOf(HTMLCanvasElement);
  });

  it("возвращает объект с app и container", () => {
    const { app, container } = createPixiApp(document.createElement("div"));
    expect(app).toBeDefined();
    expect(container).toBeDefined();
  });

  it("создаёт Application с forceCanvas: true", () => {
    createPixiApp(document.createElement("div"));
    expect(vi.mocked(PIXI.Application)).toHaveBeenCalledWith(
      expect.objectContaining({ forceCanvas: true })
    );
  });

  it("создаёт Application с нужными размерами", () => {
    createPixiApp(document.createElement("div"));
    expect(vi.mocked(PIXI.Application)).toHaveBeenCalledWith(
      expect.objectContaining({ width: 400, height: 300 })
    );
  });
});

describe("populateScene", () => {
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
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
});
