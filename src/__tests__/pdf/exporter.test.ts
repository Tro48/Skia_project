import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportToPdf } from "../../pdf/exporter";

vi.mock("../../skia/renderer", () => ({ renderContainerToSkia: vi.fn() }));
vi.mock("pixi.js-legacy", () => ({
	Container: class {
		visible = true;
		worldAlpha = 1;
		x = 0;
		y = 0;
		rotation = 0;
		scale = { x: 1, y: 1 };
		pivot = { x: 0, y: 0 };
		children: unknown[] = [];
	},
	Graphics: class {
		visible = true;
		worldAlpha = 1;
		x = 0;
		y = 0;
		rotation = 0;
		scale = { x: 1, y: 1 };
		pivot = { x: 0, y: 0 };
		children: unknown[] = [];
		geometry = { graphicsData: [] };
	},
	Sprite: class {},
	Rectangle: class {},
	Circle: class {},
	Ellipse: class {},
	Polygon: class {},
}));

// --- mock jsPDF ---

const mockCtx = {
	fillStyle: "",
	strokeStyle: "",
	lineWidth: 1,
	fillRect: vi.fn(),
	beginPath: vi.fn(),
	fill: vi.fn(),
	stroke: vi.fn(),
	save: vi.fn(),
	restore: vi.fn(),
	transform: vi.fn(),
	rect: vi.fn(),
	arc: vi.fn(),
	moveTo: vi.fn(),
	lineTo: vi.fn(),
	closePath: vi.fn(),
	translate: vi.fn(),
	scale: vi.fn(),
	drawImage: vi.fn(),
};

const mockSave = vi.fn();

vi.mock("jspdf", () => ({
	jsPDF: vi.fn(function (this: { context2d: typeof mockCtx; save: typeof mockSave }) {
		this.context2d = mockCtx;
		this.save = mockSave;
	}),
}));

function makeContainer() {
	return {
		children: [],
		visible: true,
		worldAlpha: 1,
		x: 0,
		y: 0,
		rotation: 0,
		scale: { x: 1, y: 1 },
		pivot: { x: 0, y: 0 },
	};
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("exportToPdf — PDF документ", () => {
	it("создаёт jsPDF с unit: px и переданными размерами", async () => {
		exportToPdf({ container: makeContainer() as any, width: 800, height: 600 });
		const { jsPDF } = await import("jspdf");
		expect(jsPDF).toHaveBeenCalledWith(expect.objectContaining({ unit: "px", format: [800, 600] }));
	});

	it("использует orientation landscape если width >= height", async () => {
		exportToPdf({ container: makeContainer() as any, width: 400, height: 300 });
		const { jsPDF } = await import("jspdf");
		expect(jsPDF).toHaveBeenCalledWith(expect.objectContaining({ orientation: "landscape" }));
	});

	it("использует orientation portrait если height > width", async () => {
		exportToPdf({ container: makeContainer() as any, width: 300, height: 400 });
		const { jsPDF } = await import("jspdf");
		expect(jsPDF).toHaveBeenCalledWith(expect.objectContaining({ orientation: "portrait" }));
	});

	it("вызывает pdf.save('scene.pdf')", () => {
		exportToPdf({ container: makeContainer() as any, width: 400, height: 300 });
		expect(mockSave).toHaveBeenCalledWith("scene.pdf");
	});
});

describe("exportToPdf — фоновый прямоугольник", () => {
	it("заливает фон через context2d.fillRect на весь размер", () => {
		exportToPdf({ container: makeContainer() as any, width: 400, height: 300 });
		expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 400, 300);
	});
});

describe("exportToPdf — рендер объектов", () => {
	it("вызывает ctx.save и ctx.restore для дочернего объекта", () => {
		const child = {
			visible: true,
			worldAlpha: 1,
			x: 0,
			y: 0,
			rotation: 0,
			scale: { x: 1, y: 1 },
			pivot: { x: 0, y: 0 },
			children: [],
		};
		const container = { ...makeContainer(), children: [child] };
		exportToPdf({ container: container as any, width: 400, height: 300 });
		// container + child = минимум 2 вызова save/restore
		expect(mockCtx.save.mock.calls.length).toBeGreaterThanOrEqual(2);
		expect(mockCtx.restore.mock.calls.length).toBeGreaterThanOrEqual(2);
	});

	it("пропускает невидимый объект (visible=false)", () => {
		const child = {
			visible: false,
			worldAlpha: 1,
			x: 0,
			y: 0,
			rotation: 0,
			scale: { x: 1, y: 1 },
			pivot: { x: 0, y: 0 },
			children: [],
		};
		const container = { ...makeContainer(), children: [child] };
		exportToPdf({ container: container as any, width: 400, height: 300 });
		// save вызывается только один раз — для container, не для child
		expect(mockCtx.save.mock.calls.length).toBe(1);
	});

	it("вызывает ctx.transform с матрицей из 6 аргументов", () => {
		exportToPdf({ container: makeContainer() as any, width: 400, height: 300 });
		expect(mockCtx.transform).toHaveBeenCalledWith(
			expect.any(Number),
			expect.any(Number),
			expect.any(Number),
			expect.any(Number),
			expect.any(Number),
			expect.any(Number)
		);
	});
});
