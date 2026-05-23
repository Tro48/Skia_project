import * as PIXI from "pixi.js-legacy";
import type { AttachPointerEventsParams, SetupEventsParams } from "./types";

export function attachPointerEvents({ canvas, onDown, onUp }: AttachPointerEventsParams): void {
	canvas.addEventListener("pointerdown", (e) => {
		const rect = canvas.getBoundingClientRect();
		onDown(e.clientX - rect.left, e.clientY - rect.top);
	});

	canvas.addEventListener("pointerup", (e) => {
		const rect = canvas.getBoundingClientRect();
		onUp(e.clientX - rect.left, e.clientY - rect.top);
	});
}

export function setupEvents({ pixiCanvas, skiaCanvas, container, onInteract }: SetupEventsParams): void {
	// На Pixi-canvas событие пробрасывается через встроенный Interaction Manager,
	// который уже знает об interactive-объектах — дополнительного hit-testing не нужно.
	attachPointerEvents({
		canvas: pixiCanvas,
		onDown: () => onInteract?.(),
		onUp: () => onInteract?.(),
	});

	// На Skia-canvas нет встроенного менеджера событий — делаем hit-test вручную.
	attachPointerEvents({
		canvas: skiaCanvas,
		onDown: (x, y) => {
			if (container) {
				const hit = hitTest(container, x, y);
				if (hit) hit.emit("pointerdown", { x, y });
			}
			onInteract?.();
		},
		onUp: (x, y) => {
			if (container) {
				const hit = hitTest(container, x, y);
				if (hit) hit.emit("pointerup", { x, y });
			}
			onInteract?.();
		},
	});
}

/**
 * Обходит дерево контейнера в обратном z-порядке и возвращает первый объект,
 * чей world-space AABB содержит точку (x, y).
 */
export function hitTest(container: PIXI.Container, x: number, y: number): PIXI.DisplayObject | null {
	const children = container.children;

	for (let i = children.length - 1; i >= 0; i--) {
		const child = children[i];

		if (!child.visible || child.worldAlpha <= 0) continue;

		if (child instanceof PIXI.Container) {
			const found = hitTest(child, x, y);
			if (found) return found;
		}

		// getBounds() возвращает AABB в мировых координатах
		const bounds = child.getBounds();
		if (bounds.contains(x, y)) return child;
	}

	return null;
}
