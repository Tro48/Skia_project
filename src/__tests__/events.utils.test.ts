import { describe, expect, it, vi } from "vitest";
import { attachPointerEvents, hitTest, setupEvents } from "../events.utils";

// events.utils импортирует PIXI для instanceof-проверок в hitTest
vi.mock("pixi.js-legacy", () => {
	class Container {
		visible = true;
		worldAlpha = 1;
		children: unknown[] = [];
	}
	class Point {
		constructor(public x: number, public y: number) {}
	}
	return { Container, Point };
});

function makeCanvas(rectOffset = { left: 0, top: 0 }) {
	const canvas = document.createElement("canvas");
	// Размеры canvas = размеры rect → scaleX/scaleY = 1, координаты не меняются
	canvas.width = 400;
	canvas.height = 300;
	vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
		left: rectOffset.left,
		top: rectOffset.top,
		right: rectOffset.left + 400,
		bottom: rectOffset.top + 300,
		width: 400,
		height: 300,
		x: rectOffset.left,
		y: rectOffset.top,
		toJSON: () => ({}),
	});
	return canvas;
}

// ---- attachPointerEvents ----

describe("attachPointerEvents — pointerdown", () => {
	it("вызывает onDown при pointerdown", () => {
		const canvas = makeCanvas();
		const onDown = vi.fn();
		attachPointerEvents({ canvas, onDown, onUp: vi.fn() });

		canvas.dispatchEvent(new PointerEvent("pointerdown", { clientX: 100, clientY: 150 }));

		expect(onDown).toHaveBeenCalledOnce();
		expect(onDown).toHaveBeenCalledWith(100, 150);
	});

	it("не вызывает onUp при pointerdown", () => {
		const canvas = makeCanvas();
		const onUp = vi.fn();
		attachPointerEvents({ canvas, onDown: vi.fn(), onUp });

		canvas.dispatchEvent(new PointerEvent("pointerdown", { clientX: 10, clientY: 10 }));

		expect(onUp).not.toHaveBeenCalled();
	});

	it("вычитает rect.left и rect.top из координат", () => {
		const canvas = makeCanvas({ left: 50, top: 30 });
		const onDown = vi.fn();
		attachPointerEvents({ canvas, onDown, onUp: vi.fn() });

		canvas.dispatchEvent(new PointerEvent("pointerdown", { clientX: 120, clientY: 80 }));

		expect(onDown).toHaveBeenCalledWith(70, 50); // 120-50, 80-30
	});

	it("срабатывает несколько раз при повторных событиях", () => {
		const canvas = makeCanvas();
		const onDown = vi.fn();
		attachPointerEvents({ canvas, onDown, onUp: vi.fn() });

		canvas.dispatchEvent(new PointerEvent("pointerdown", { clientX: 1, clientY: 1 }));
		canvas.dispatchEvent(new PointerEvent("pointerdown", { clientX: 2, clientY: 2 }));

		expect(onDown).toHaveBeenCalledTimes(2);
	});
});

describe("attachPointerEvents — pointerup", () => {
	it("вызывает onUp при pointerup", () => {
		const canvas = makeCanvas();
		const onUp = vi.fn();
		attachPointerEvents({ canvas, onDown: vi.fn(), onUp });

		canvas.dispatchEvent(new PointerEvent("pointerup", { clientX: 200, clientY: 50 }));

		expect(onUp).toHaveBeenCalledOnce();
		expect(onUp).toHaveBeenCalledWith(200, 50);
	});

	it("не вызывает onDown при pointerup", () => {
		const canvas = makeCanvas();
		const onDown = vi.fn();
		attachPointerEvents({ canvas, onDown, onUp: vi.fn() });

		canvas.dispatchEvent(new PointerEvent("pointerup", { clientX: 10, clientY: 10 }));

		expect(onDown).not.toHaveBeenCalled();
	});

	it("вычитает rect.left и rect.top из координат", () => {
		const canvas = makeCanvas({ left: 20, top: 10 });
		const onUp = vi.fn();
		attachPointerEvents({ canvas, onDown: vi.fn(), onUp });

		canvas.dispatchEvent(new PointerEvent("pointerup", { clientX: 70, clientY: 60 }));

		expect(onUp).toHaveBeenCalledWith(50, 50); // 70-20, 60-10
	});
});

// ---- setupEvents ----

describe("setupEvents — onInteract", () => {
	it("вызывает onInteract при pointerdown на pixi-canvas", () => {
		const pixiCanvas = makeCanvas();
		const onInteract = vi.fn();
		setupEvents({ pixiCanvas, skiaCanvas: makeCanvas(), onInteract });

		pixiCanvas.dispatchEvent(new PointerEvent("pointerdown", {}));

		expect(onInteract).toHaveBeenCalledOnce();
	});

	it("вызывает onInteract при pointerup на skia-canvas", () => {
		const skiaCanvas = makeCanvas();
		const onInteract = vi.fn();
		setupEvents({ pixiCanvas: makeCanvas(), skiaCanvas, onInteract });

		skiaCanvas.dispatchEvent(new PointerEvent("pointerup", {}));

		expect(onInteract).toHaveBeenCalledOnce();
	});

	it("вызывает onInteract для каждого события на обоих canvas", () => {
		const pixiCanvas = makeCanvas();
		const skiaCanvas = makeCanvas();
		const onInteract = vi.fn();
		setupEvents({ pixiCanvas, skiaCanvas, onInteract });

		pixiCanvas.dispatchEvent(new PointerEvent("pointerdown", {}));
		pixiCanvas.dispatchEvent(new PointerEvent("pointerup", {}));
		skiaCanvas.dispatchEvent(new PointerEvent("pointerdown", {}));
		skiaCanvas.dispatchEvent(new PointerEvent("pointerup", {}));

		expect(onInteract).toHaveBeenCalledTimes(4);
	});

	it("onInteract необязателен — не выбрасывает исключение при его отсутствии", () => {
		const pixiCanvas = makeCanvas();
		setupEvents({ pixiCanvas, skiaCanvas: makeCanvas() });

		expect(() => {
			pixiCanvas.dispatchEvent(new PointerEvent("pointerdown", {}));
		}).not.toThrow();
	});
});

describe("setupEvents — не пишет в #status", () => {
	it("не изменяет #status при pointer-событиях", () => {
		const statusEl = document.createElement("div");
		statusEl.id = "status";
		statusEl.textContent = "Готово";
		document.body.appendChild(statusEl);

		const pixiCanvas = makeCanvas();
		setupEvents({ pixiCanvas, skiaCanvas: makeCanvas() });
		pixiCanvas.dispatchEvent(new PointerEvent("pointerdown", { clientX: 10, clientY: 20 }));
		pixiCanvas.dispatchEvent(new PointerEvent("pointerup", { clientX: 10, clientY: 20 }));

		expect(statusEl.textContent).toBe("Готово");
		statusEl.remove();
	});
});

// ---- hitTest ----

function makeBounds(x: number, y: number, w: number, h: number) {
	return { contains: (px: number, py: number) => px >= x && px <= x + w && py >= y && py <= y + h };
}

function makeObj(bounds: ReturnType<typeof makeBounds>, visible = true, worldAlpha = 1) {
	return { visible, worldAlpha, getBounds: () => bounds, children: [] };
}

describe("hitTest", () => {
	it("возвращает объект, чей bounds содержит точку", () => {
		const obj = makeObj(makeBounds(10, 10, 100, 100));
		const container = { children: [obj], visible: true, worldAlpha: 1 };
		const result = hitTest(container as any, 50, 50);
		expect(result).toBe(obj);
	});

	it("возвращает null если ни один объект не содержит точку", () => {
		const obj = makeObj(makeBounds(10, 10, 50, 50));
		const container = { children: [obj], visible: true, worldAlpha: 1 };
		expect(hitTest(container as any, 200, 200)).toBeNull();
	});

	it("пропускает объекты с visible=false", () => {
		const obj = makeObj(makeBounds(0, 0, 400, 300), false);
		const container = { children: [obj], visible: true, worldAlpha: 1 };
		expect(hitTest(container as any, 50, 50)).toBeNull();
	});

	it("пропускает объекты с worldAlpha=0", () => {
		const obj = makeObj(makeBounds(0, 0, 400, 300), true, 0);
		const container = { children: [obj], visible: true, worldAlpha: 1 };
		expect(hitTest(container as any, 50, 50)).toBeNull();
	});

	it("возвращает верхний объект (последний в z-порядке) при перекрытии", () => {
		const bottom = makeObj(makeBounds(0, 0, 200, 200));
		const top = makeObj(makeBounds(0, 0, 200, 200));
		const container = { children: [bottom, top], visible: true, worldAlpha: 1 };
		expect(hitTest(container as any, 100, 100)).toBe(top);
	});

	it("эмитирует pointerdown на найденном объекте при клике на Skia canvas", () => {
		const onDown = vi.fn();
		const obj = { ...makeObj(makeBounds(0, 0, 400, 300)), emit: onDown };
		const container = { children: [obj], visible: true, worldAlpha: 1 };
		const skiaCanvas = makeCanvas();
		setupEvents({ pixiCanvas: makeCanvas(), skiaCanvas, container: container as any });

		skiaCanvas.dispatchEvent(new PointerEvent("pointerdown", { clientX: 50, clientY: 50 }));

		expect(onDown).toHaveBeenCalledWith("pointerdown", expect.objectContaining({ x: 50, y: 50 }));
	});
});
