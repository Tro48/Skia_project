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

export function setupEvents({ pixiCanvas, skiaCanvas, onInteract }: SetupEventsParams): void {
	const status = document.getElementById("status");

	const log = (src: string, type: string, x: number, y: number) => {
		if (status) {
			status.textContent = `${src} ${type}: (${Math.round(x)}, ${Math.round(y)})`;
		}
		onInteract?.();
	};

	attachPointerEvents({
		canvas: pixiCanvas,
		onDown: (x, y) => log("Pixi", "pointerDown", x, y),
		onUp: (x, y) => log("Pixi", "pointerUp", x, y),
	});

	attachPointerEvents({
		canvas: skiaCanvas,
		onDown: (x, y) => log("Skia", "pointerDown", x, y),
		onUp: (x, y) => log("Skia", "pointerUp", x, y),
	});
}
