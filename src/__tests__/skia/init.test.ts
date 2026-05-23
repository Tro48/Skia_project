import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCanvasKit = { version: "mock-ck" };

vi.mock("canvaskit-wasm", () => ({
	default: vi.fn().mockResolvedValue(mockCanvasKit),
}));

// Каждый тест получает свежий модуль (сбрасываем синглтон _ck)
beforeEach(() => {
	vi.resetModules();
});

describe("getCanvasKit", () => {
	it("бросает ошибку, если initCanvasKit не был вызван", async () => {
		const { getCanvasKit } = await import("../../skia/init");
		expect(() => getCanvasKit()).toThrow("CanvasKit не инициализирован");
	});

	it("возвращает экземпляр после инициализации", async () => {
		const { initCanvasKit, getCanvasKit } = await import("../../skia/init");
		await initCanvasKit();
		expect(getCanvasKit()).toBe(mockCanvasKit);
	});
});

describe("initCanvasKit", () => {
	it("возвращает экземпляр CanvasKit", async () => {
		const { initCanvasKit } = await import("../../skia/init");
		const result = await initCanvasKit();
		expect(result).toBe(mockCanvasKit);
	});

	it("синглтон — повторный вызов возвращает тот же объект", async () => {
		const { initCanvasKit } = await import("../../skia/init");
		const first = await initCanvasKit();
		const second = await initCanvasKit();
		expect(first).toBe(second);
	});

	it("загружает WASM только один раз при повторных вызовах", async () => {
		const { initCanvasKit } = await import("../../skia/init");
		const ckModule = await import("canvaskit-wasm");
		await initCanvasKit();
		await initCanvasKit();
		expect(ckModule.default).toHaveBeenCalledOnce();
	});
});
