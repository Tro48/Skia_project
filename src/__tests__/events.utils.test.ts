import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { attachPointerEvents, setupEvents } from "../events.utils";

function makeCanvas(rectOffset = { left: 0, top: 0 }) {
	const canvas = document.createElement("canvas");
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

describe("setupEvents — #status обновление", () => {
	let statusEl: HTMLElement;

	beforeEach(() => {
		statusEl = document.createElement("div");
		statusEl.id = "status";
		document.body.appendChild(statusEl);
	});

	afterEach(() => {
		statusEl.remove();
	});

	it("поставляет 'Pixi pointerDown' при pointerdown на pixi-canvas", () => {
		const pixiCanvas = makeCanvas();
		setupEvents({ pixiCanvas, skiaCanvas: makeCanvas() });

		pixiCanvas.dispatchEvent(new PointerEvent("pointerdown", { clientX: 10, clientY: 20 }));

		expect(statusEl.textContent).toBe("Pixi pointerDown: (10, 20)");
	});

	it("поставляет 'Pixi pointerUp' при pointerup на pixi-canvas", () => {
		const pixiCanvas = makeCanvas();
		setupEvents({ pixiCanvas, skiaCanvas: makeCanvas() });

		pixiCanvas.dispatchEvent(new PointerEvent("pointerup", { clientX: 15, clientY: 25 }));

		expect(statusEl.textContent).toBe("Pixi pointerUp: (15, 25)");
	});

	it("поставляет 'Skia pointerDown' при pointerdown на skia-canvas", () => {
		const skiaCanvas = makeCanvas();
		setupEvents({ pixiCanvas: makeCanvas(), skiaCanvas });

		skiaCanvas.dispatchEvent(new PointerEvent("pointerdown", { clientX: 5, clientY: 10 }));

		expect(statusEl.textContent).toBe("Skia pointerDown: (5, 10)");
	});

	it("поставляет 'Skia pointerUp' при pointerup на skia-canvas", () => {
		const skiaCanvas = makeCanvas();
		setupEvents({ pixiCanvas: makeCanvas(), skiaCanvas });

		skiaCanvas.dispatchEvent(new PointerEvent("pointerup", { clientX: 30, clientY: 40 }));

		expect(statusEl.textContent).toBe("Skia pointerUp: (30, 40)");
	});

	it("округляет координаты в тексте статуса", () => {
		// canvas смещён на дробное значение — координаты будут дробными
		const pixiCanvas = makeCanvas({ left: 0.3, top: 0.7 });
		setupEvents({ pixiCanvas, skiaCanvas: makeCanvas() });

		pixiCanvas.dispatchEvent(new PointerEvent("pointerdown", { clientX: 10, clientY: 20 }));

		// Math.round(10 - 0.3) = 10, Math.round(20 - 0.7) = 19
		expect(statusEl.textContent).toBe("Pixi pointerDown: (10, 19)");
	});
});

describe("setupEvents — onInteract", () => {
	let statusEl: HTMLElement;

	beforeEach(() => {
		statusEl = document.createElement("div");
		statusEl.id = "status";
		document.body.appendChild(statusEl);
	});

	afterEach(() => {
		statusEl.remove();
	});

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

describe("setupEvents — без #status в DOM", () => {
	it("не выбрасывает исключение если #status отсутствует", () => {
		const pixiCanvas = makeCanvas();
		setupEvents({ pixiCanvas, skiaCanvas: makeCanvas() });

		expect(() => {
			pixiCanvas.dispatchEvent(new PointerEvent("pointerdown", { clientX: 1, clientY: 2 }));
		}).not.toThrow();
	});
});
