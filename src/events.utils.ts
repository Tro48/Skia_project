import * as PIXI from "pixi.js-legacy";
import type { AttachPointerEventsParams, SetupEventsParams } from "./types";

type Emittable = { emit(event: string, data: Record<string, number>): void };
type WithContainsPoint = PIXI.DisplayObject & {
	containsPoint?: (point: PIXI.IPointData) => boolean;
};

export function attachPointerEvents({ canvas, onDown, onUp }: AttachPointerEventsParams): void {
	canvas.addEventListener("pointerdown", (e) => {
		onDown(...canvasCoords(canvas, e));
	});

	canvas.addEventListener("pointerup", (e) => {
		onUp(...canvasCoords(canvas, e));
	});
}

export function setupEvents({
	pixiCanvas,
	skiaCanvas,
	container,
	onInteract,
}: SetupEventsParams): void {
	// На Pixi-canvas события пробрасываются через встроенный Interaction Manager —
	// дополнительного hit-testing не нужно.
	attachPointerEvents({
		canvas: pixiCanvas,
		onDown: () => onInteract?.(),
		onUp: () => onInteract?.(),
	});

	// На Skia-canvas нет встроенного менеджера — делаем hit-test вручную.
	attachPointerEvents({
		canvas: skiaCanvas,
		onDown: (x, y) => {
			if (container) {
				const hit = hitTest(container, x, y);
				if (hit) (hit as unknown as Emittable).emit("pointerdown", { x, y });
			}
			onInteract?.();
		},
		onUp: (x, y) => {
			if (container) {
				const hit = hitTest(container, x, y);
				if (hit) (hit as unknown as Emittable).emit("pointerup", { x, y });
			}
			onInteract?.();
		},
	});

	// Изменяем cursor на Skia-canvas при наведении на интерактивный объект
	if (container) {
		skiaCanvas.addEventListener("mousemove", (e) => {
			const [x, y] = canvasCoords(skiaCanvas, e);
			const hit = hitTest(container, x, y);
			skiaCanvas.style.cursor = hit ? "pointer" : "default";
		});
	}
}

/**
 * Конвертирует координаты MouseEvent из CSS-пикселей в пиксели canvas.
 * Необходимо когда canvas CSS-масштабирован (max-inline-size: 100%).
 */
function canvasCoords(canvas: HTMLCanvasElement, e: MouseEvent): [number, number] {
	const rect = canvas.getBoundingClientRect();
	const scaleX = canvas.width / rect.width;
	const scaleY = canvas.height / rect.height;
	return [(e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY];
}

/**
 * Обходит дерево контейнера в обратном z-порядке и возвращает первый объект,
 * содержащий точку (x, y). Использует containsPoint для точного теста
 * (учитывает вращение и масштаб), с fallback на AABB для не-Graphics объектов.
 */
export function hitTest(
	container: PIXI.Container,
	x: number,
	y: number
): PIXI.DisplayObject | null {
	const children = container.children;
	const point = new PIXI.Point(x, y);

	for (let i = children.length - 1; i >= 0; i--) {
		const child = children[i];

		if (!child.visible || child.worldAlpha <= 0) continue;

		if (child instanceof PIXI.Container) {
			const found = hitTest(child, x, y);
			if (found) return found;
		}

		const containsPoint = (child as WithContainsPoint).containsPoint;
		const hit =
			typeof containsPoint === "function"
				? containsPoint.call(child, point)
				: child.getBounds().contains(x, y);

		if (hit) return child;
	}

	return null;
}
