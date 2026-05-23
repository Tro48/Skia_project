import type { RenderContainerToSkiaParams } from "../types";
import { renderDisplayObject } from "./renderer.utils";

// Цвет фона сцены — совпадает с backgroundColor в Pixi
const BG_COLOR = { r: 0x16 / 255, g: 0x21 / 255, b: 0x3e / 255, a: 1 };

export function renderContainerToSkia({
	ck,
	canvas,
	container,
	width,
	height,
}: RenderContainerToSkiaParams): void {
	const bgPaint = new ck.Paint();
	bgPaint.setColor(ck.Color4f(BG_COLOR.r, BG_COLOR.g, BG_COLOR.b, BG_COLOR.a));
	bgPaint.setStyle(ck.PaintStyle.Fill);
	canvas.drawRect(ck.LTRBRect(0, 0, width, height), bgPaint);
	bgPaint.delete();

	renderDisplayObject({ ck, canvas, obj: container });
}
