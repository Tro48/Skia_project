import * as PIXI from "pixi.js-legacy";
import type { Scene } from "../types";

export function createPixiApp(canvas: HTMLCanvasElement): Scene {
	const app = new PIXI.Application({
		width: canvas.width,
		height: canvas.height,
		backgroundColor: 0xf6f6f6,
		forceCanvas: true,
		antialias: true,
		view: canvas,
	});

	const container = new PIXI.Container();
	app.stage.addChild(container);

	return { app, container };
}

/** Воспроизводит пример сцены из ТЗ: subContainer + g1..g4 с трансформациями и событиями. */
export function createExampleScene(container: PIXI.Container): void {
	container.removeChildren();

	const subContainer = new PIXI.Container();
	const g1 = new PIXI.Graphics();
	const g2 = new PIXI.Graphics();
	const g3 = new PIXI.Graphics();
	const g4 = new PIXI.Graphics();

	g1.beginFill(0xff0000).drawEllipse(0, 0, 200, 100).endFill();
	g1.position.set(200, 100);
	g1.angle = 30;
	g1.interactive = true;
	g1.cursor = "pointer";
	g1.on("pointerdown", () => {
		console.log("g1 pointerdown!");
	});

	g2.beginFill(0x0000ff).drawRect(-50, -75, 100, 150).endFill();
	g2.position.set(120, 60);
	g2.angle = 15;
	g2.scale.set(1.5, 1.7);
	g2.interactive = true;
	g2.cursor = "pointer";
	g2.on("pointerup", () => {
		console.log("g2 pointerup!");
	});

	g3.lineStyle(10, 0xffffff, 1).moveTo(0, 0).lineTo(150, 100);
	g3.angle = -20;

	g4.lineStyle(10, 0xffff00, 1).moveTo(0, 70).lineTo(150, -30);
	g4.angle = 20;

	subContainer.position.set(75, 50);
	subContainer.addChild(g3, g4);
	container.addChild(subContainer, g1, g2);
}

/** Добавляет случайные фигуры в контейнер (4–8 штук). */
export function populateScene(container: PIXI.Container): void {
	container.removeChildren();
	const count = 4 + Math.floor(Math.random() * 5);

	for (let i = 0; i < count; i++) {
		container.addChild(createRandomShape());
	}
}

function createRandomShape(): PIXI.Graphics {
	const g = new PIXI.Graphics();
	const fillColor = Math.random() * 0xffffff;
	const strokeColor = Math.random() * 0xffffff;
	g.lineStyle(4, strokeColor, 1);
	g.beginFill(fillColor, 0.7);

	const type = Math.floor(Math.random() * 3);
	switch (type) {
		case 0: {
			const w = 40 + Math.random() * 80;
			const h = 30 + Math.random() * 60;
			g.drawRect(0, 0, w, h);
			break;
		}
		case 1: {
			const r = 20 + Math.random() * 40;
			g.drawCircle(0, 0, r);
			break;
		}
		default: {
			const size = 30 + Math.random() * 50;
			g.moveTo(0, -size);
			g.lineTo(size * 0.866, size * 0.5);
			g.lineTo(-size * 0.866, size * 0.5);
			g.closePath();
		}
	}

	g.endFill();

	g.x = 30 + Math.random() * 320;
	g.y = 30 + Math.random() * 240;
	g.rotation = Math.random() * Math.PI * 2;
	g.scale.set(0.5 + Math.random() * 1.5);

	// Интерактивность нужна для корректной работы событий pointerdown/pointerup
	g.interactive = true;
	g.cursor = "pointer";

	return g;
}
