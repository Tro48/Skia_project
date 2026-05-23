import { setupEvents } from "./events.utils";
import { exportToPdf } from "./pdf/exporter";
import { createExampleScene, createPixiApp, populateScene } from "./pixi/scene";
import { initCanvasKit } from "./skia/init";
import { renderContainerToSkia } from "./skia/renderer";
import type { RenderSkiaParams } from "./types";

const WIDTH = 400;
const HEIGHT = 300;

async function main(): Promise<void> {
	const status = document.getElementById("status")!;

	const ck = await initCanvasKit();
	status.textContent = "CanvasKit загружен";

	const mountEl = document.getElementById("pixi-canvas") as HTMLCanvasElement;
	const { app, container } = createPixiApp(mountEl);
	const pixiCanvas = app.view as HTMLCanvasElement;

	const skiaCanvasEl = document.getElementById("skia-canvas") as HTMLCanvasElement;

	const surface = ck.MakeWebGLCanvasSurface(skiaCanvasEl) ?? ck.MakeSWCanvasSurface(skiaCanvasEl);
	if (!surface) {
		status.textContent = "Ошибка создания Skia surface";
		return;
	}

	renderSkia({ ck, surface, container });
	setupEvents({
		pixiCanvas,
		skiaCanvas: skiaCanvasEl,
		container,
		onInteract: () => renderSkia({ ck, surface, container }),
	});

	status.textContent = "Канвас готов к работе";

	const btnPdf = document.getElementById("btn-pdf") as HTMLButtonElement;

	function showCanvases(): void {
		document
			.querySelectorAll<HTMLElement>(".canvas-placeholder")
			.forEach((el) => el.classList.add("hidden"));
		btnPdf.disabled = false;
	}

	document.getElementById("btn-example")!.addEventListener("click", () => {
		createExampleScene(container);
		renderSkia({ ck, surface, container });
		showCanvases();
		status.textContent = "Готово";
	});

	document.getElementById("btn-random")!.addEventListener("click", () => {
		populateScene(container);
		renderSkia({ ck, surface, container });
		showCanvases();
		status.textContent = "Готово";
	});

	document.getElementById("btn-pdf")!.addEventListener("click", () => {
		status.textContent = "Генерация PDF…";
		exportToPdf({ container, width: WIDTH, height: HEIGHT });
		status.textContent = "PDF скачан";
	});
}

function renderSkia({ ck, surface, container }: RenderSkiaParams): void {
	const skCanvas = surface.getCanvas();
	skCanvas.clear(ck.TRANSPARENT);
	renderContainerToSkia({ ck, canvas: skCanvas, container, width: WIDTH, height: HEIGHT });
	surface.flush();
}

main().catch(console.error);
