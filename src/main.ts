import { setupEvents } from "./events.utils";
import { createPixiApp, populateScene } from "./pixi/scene";
import { initCanvasKit } from "./skia/init";
import { renderContainerToSkia } from "./skia/renderer";
import "./styles/main.css";
import "./styles/reset.css";
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

	const surface = ck.MakeWebGLCanvasSurface(skiaCanvasEl) ?? ck.MakeSWCanvasSurface(skiaCanvasEl); // fallback на CPU-рендеринг
	if (!surface) {
		status.textContent = "Ошибка создания Skia surface";
		return;
	}
	populateScene(container);
	renderSkia({ ck, surface, container });
	setupEvents({
		pixiCanvas,
		skiaCanvas: skiaCanvasEl,
		onInteract: () => renderSkia({ ck, surface, container }),
	});

	document.getElementById("btn-random")!.addEventListener("click", () => {
		populateScene(container);
		renderSkia({ ck, surface, container }); // перерендериваем Skia после изменения сцены
	});
	status.textContent = "Готово";
}

// Функция синхронного обновления Skia-canvas
function renderSkia({ ck, surface, container }: RenderSkiaParams): void {
	const skCanvas = surface.getCanvas();
	skCanvas.clear(ck.TRANSPARENT);
	renderContainerToSkia({ ck, canvas: skCanvas, container, width: WIDTH, height: HEIGHT });
	surface.flush();
}

main().catch(console.error);
