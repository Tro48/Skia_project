import type { Path } from "canvaskit-wasm";
import * as PIXI from "pixi.js-legacy";
import {
	BuildPathParams,
	HexToSkiaColorParams,
	RenderDisplayObjectParams,
	RenderGraphicsParams,
	RenderSpriteParams,
} from "../types";

export function renderDisplayObject({ ck, canvas, obj }: RenderDisplayObjectParams): void {
	if (!obj.visible || obj.worldAlpha <= 0) return;

	canvas.save();
	applyTransform({ ck, canvas, obj });

	if (obj instanceof PIXI.Graphics) {
		renderGraphics({ ck, canvas, obj });
	} else if (obj instanceof PIXI.Sprite) {
		renderSprite({ ck, canvas, obj });
	}

	if (obj instanceof PIXI.Container) {
		for (const child of obj.children) {
			renderDisplayObject({ ck, canvas, obj: child });
		}
	}

	canvas.restore();
}

function applyTransform({ canvas, obj }: RenderDisplayObjectParams): void {
	const { x, y, rotation } = obj;
	const sx = obj.scale.x;
	const sy = obj.scale.y;
	const px = obj.pivot.x;
	const py = obj.pivot.y;

	const cos = Math.cos(rotation);
	const sin = Math.sin(rotation);

	// Affine 3×3 matrix: T(x,y) · R(rotation) · S(sx,sy) · T(-pivot)
	// Именно этот порядок использует Pixi внутри DisplayObject.updateTransform().
	const a = sx * cos;
	const b = sx * sin;
	const c = -sy * sin;
	const d = sy * cos;
	const tx = x - (a * px + c * py);
	const ty = y - (b * px + d * py);

	// CanvasKit ожидает плоский массив 9 чисел в row-major порядке
	canvas.concat([a, c, tx, b, d, ty, 0, 0, 1]);
}

function renderGraphics({ ck, canvas, obj }: RenderGraphicsParams): void {
	const graphicsData = obj.geometry.graphicsData as PIXI.GraphicsData[];

	for (const data of graphicsData) {
		const path = buildPath({ ck, data });
		if (!path) continue;

		const alpha = obj.worldAlpha;

		if (data.fillStyle.visible) {
			const fill = new ck.Paint();
			fill.setStyle(ck.PaintStyle.Fill);
			fill.setColor(
				hexToSkiaColor({ ck, hex: data.fillStyle.color, alpha: data.fillStyle.alpha * alpha })
			);
			fill.setAntiAlias(true);
			canvas.drawPath(path, fill);
			fill.delete();
		}

		if (data.lineStyle.visible) {
			const stroke = new ck.Paint();
			stroke.setStyle(ck.PaintStyle.Stroke);
			stroke.setColor(
				hexToSkiaColor({ ck, hex: data.lineStyle.color, alpha: data.lineStyle.alpha * alpha })
			);
			stroke.setStrokeWidth(data.lineStyle.width);
			stroke.setAntiAlias(true);
			canvas.drawPath(path, stroke);
			stroke.delete();
		}

		// Paint и Path — WASM-объекты, не подпадают под GC JavaScript
		path.delete();
	}
}

// Переводит PIXI.GraphicsData в Skia Path.
// Покрывает drawRect (Rectangle), drawCircle (Circle), moveTo/lineTo (Polygon), drawShape (Ellipse).
function buildPath({ ck, data }: BuildPathParams): Path | null {
	const builder = new ck.PathBuilder();
	const shape = data.shape;

	if (shape instanceof PIXI.Rectangle) {
		builder.addRect(ck.LTRBRect(shape.x, shape.y, shape.x + shape.width, shape.y + shape.height));
	} else if (shape instanceof PIXI.Circle) {
		builder.addCircle(shape.x, shape.y, shape.radius);
	} else if (shape instanceof PIXI.Polygon) {
		// Pixi хранит точки полигона как плоский массив [x0, y0, x1, y1, ...]
		const pts = shape.points;
		if (pts.length < 4) {
			builder.delete();
			return null;
		}
		builder.moveTo(pts[0], pts[1]);
		for (let i = 2; i < pts.length; i += 2) {
			builder.lineTo(pts[i], pts[i + 1]);
		}
		builder.close();
	} else if (shape instanceof PIXI.Ellipse) {
		// PIXI.Ellipse хранит x/y как центр, width/height как полные размеры
		builder.addOval(
			ck.LTRBRect(
				shape.x - shape.width / 2,
				shape.y - shape.height / 2,
				shape.x + shape.width / 2,
				shape.y + shape.height / 2
			)
		);
	} else {
		builder.delete();
		return null;
	}

	return builder.detach();
}

function renderSprite({ ck, canvas, obj }: RenderSpriteParams): void {
	const baseTexture = obj.texture.baseTexture;
	const source = (baseTexture.resource as PIXI.BaseImageResource)?.source;
	if (!source) return;

	// HTMLImageElement не даёт прямой доступ к пикселям — рисуем во временный canvas
	// чтобы вытащить ImageData через getImageData()
	const tmpCanvas = document.createElement("canvas");
	tmpCanvas.width = obj.texture.width;
	tmpCanvas.height = obj.texture.height;
	const ctx = tmpCanvas.getContext("2d")!;
	ctx.drawImage(source as CanvasImageSource, 0, 0);
	const imageData = ctx.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);

	const skImage = ck.MakeImage(
		{
			width: tmpCanvas.width,
			height: tmpCanvas.height,
			alphaType: ck.AlphaType.Premul,
			colorType: ck.ColorType.RGBA_8888,
			colorSpace: ck.ColorSpace.SRGB,
		},
		imageData.data,
		4 * tmpCanvas.width
	);
	if (!skImage) return;

	const paint = new ck.Paint();
	paint.setAlphaf(obj.worldAlpha);
	canvas.drawImage(skImage, 0, 0, paint);

	paint.delete();
	skImage.delete();
}

function hexToSkiaColor({ ck, hex, alpha }: HexToSkiaColorParams): Float32Array {
	const r = ((hex >> 16) & 0xff) / 255;
	const g = ((hex >> 8) & 0xff) / 255;
	const b = (hex & 0xff) / 255;
	return ck.Color4f(r, g, b, alpha);
}
