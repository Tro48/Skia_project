import type { RenderContainerToSkiaParams } from "../types";
import { renderDisplayObject } from "./renderer.utils";

const BG_COLOR = { r: 0xf6 / 255, g: 0xf6 / 255, b: 0xf6 / 255, a: 1 };

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
