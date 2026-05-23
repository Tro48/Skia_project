import { type Context2d, jsPDF } from "jspdf";
import * as PIXI from "pixi.js-legacy";
import type { ExportToPdfParams } from "../types";

const BG_COLOR = "#f6f6f6";

export function exportToPdf({ container, width, height }: ExportToPdfParams): void {
	const orientation = width >= height ? "landscape" : "portrait";
	const pdf = new jsPDF({ orientation, unit: "px", format: [width, height] });
	const ctx = pdf.context2d;

	ctx.fillStyle = BG_COLOR;
	ctx.fillRect(0, 0, width, height);

	renderDisplayObjectToCtx(ctx, container);
	pdf.save("scene.pdf");
}

function renderDisplayObjectToCtx(ctx: Context2d, obj: PIXI.DisplayObject): void {
	if (!obj.visible || obj.worldAlpha <= 0) return;

	ctx.save();
	applyTransformToCtx(ctx, obj);

	if (obj instanceof PIXI.Graphics) {
		renderGraphicsToCtx(ctx, obj);
	} else if (obj instanceof PIXI.Sprite) {
		renderSpriteToCtx(ctx, obj);
	}

	// Duck typing вместо instanceof — работает и с подклассами, и в тестах с plain-объектами
	const children = (obj as PIXI.Container).children;
	if (children?.length) {
		for (const child of children) {
			renderDisplayObjectToCtx(ctx, child);
		}
	}

	ctx.restore();
}

// Матрица идентична applyTransform в renderer.utils.ts — T(pos) · R · S · T(-pivot)
function applyTransformToCtx(ctx: Context2d, obj: PIXI.DisplayObject): void {
	const { x, y, rotation } = obj;
	const sx = obj.scale.x;
	const sy = obj.scale.y;
	const px = obj.pivot.x;
	const py = obj.pivot.y;

	const cos = Math.cos(rotation);
	const sin = Math.sin(rotation);

	const a = sx * cos;
	const b = sx * sin;
	const c = -sy * sin;
	const d = sy * cos;
	const tx = x - (a * px + c * py);
	const ty = y - (b * px + d * py);

	ctx.transform(a, b, c, d, tx, ty);
}

function renderGraphicsToCtx(ctx: Context2d, obj: PIXI.Graphics): void {
	const graphicsData = obj.geometry.graphicsData as PIXI.GraphicsData[];

	for (const data of graphicsData) {
		const alpha = obj.worldAlpha;

		ctx.beginPath();
		buildPathInCtx(ctx, data.shape);

		if (data.fillStyle.visible) {
			ctx.fillStyle = hexToRgba(data.fillStyle.color, data.fillStyle.alpha * alpha);
			ctx.fill();
		}

		if (data.lineStyle.visible) {
			ctx.strokeStyle = hexToRgba(data.lineStyle.color, data.lineStyle.alpha * alpha);
			ctx.lineWidth = data.lineStyle.width;
			ctx.stroke();
		}
	}
}

function buildPathInCtx(ctx: Context2d, shape: PIXI.IShape): void {
	if (shape instanceof PIXI.Rectangle) {
		ctx.rect(shape.x, shape.y, shape.width, shape.height);
	} else if (shape instanceof PIXI.Circle) {
		ctx.arc(shape.x, shape.y, shape.radius, 0, Math.PI * 2, false);
	} else if (shape instanceof PIXI.Ellipse) {
		// Имитируем эллипс через scale + arc единичного круга
		ctx.save();
		ctx.translate(shape.x, shape.y);
		ctx.scale(shape.width / 2, shape.height / 2);
		ctx.arc(0, 0, 1, 0, Math.PI * 2, false);
		ctx.restore();
	} else if (shape instanceof PIXI.Polygon) {
		const pts = shape.points;
		if (pts.length < 4) return;
		ctx.moveTo(pts[0], pts[1]);
		for (let i = 2; i < pts.length; i += 2) {
			ctx.lineTo(pts[i], pts[i + 1]);
		}
		ctx.closePath();
	}
}

// Sprites неизбежно растровые — drawImage принимает data URL в jsPDF context2d
function renderSpriteToCtx(ctx: Context2d, obj: PIXI.Sprite): void {
	const source = (obj.texture.baseTexture.resource as PIXI.BaseImageResource)?.source;
	if (!source) return;

	const tmp = document.createElement("canvas");
	tmp.width = obj.texture.width;
	tmp.height = obj.texture.height;
	const tmpCtx = tmp.getContext("2d")!;
	tmpCtx.drawImage(source as CanvasImageSource, 0, 0);
	const dataUrl = tmp.toDataURL("image/png");

	ctx.drawImage(dataUrl, 0, 0, obj.texture.width, obj.texture.height);
}

function hexToRgba(hex: number, alpha: number): string {
	const r = (hex >> 16) & 0xff;
	const g = (hex >> 8) & 0xff;
	const b = hex & 0xff;
	return `rgba(${r},${g},${b},${alpha})`;
}
