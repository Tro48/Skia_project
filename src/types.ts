import type { Canvas, CanvasKit, Surface } from "canvaskit-wasm";
import type * as PIXI from "pixi.js-legacy";
import type { Context2d } from "jspdf";

export interface Scene {
	app: PIXI.Application;
	container: PIXI.Container;
}

export interface RenderSkiaParams {
	ck: CanvasKit;
	surface: Surface;
	container: PIXI.Container;
}

export interface RenderContainerToSkiaParams {
	ck: CanvasKit;
	canvas: Canvas;
	container: PIXI.Container;
	width: number;
	height: number;
}

export type RenderDisplayObjectParams = Pick<RenderContainerToSkiaParams, "ck" | "canvas"> & {
	obj: PIXI.DisplayObject;
};

export type RenderGraphicsParams = Omit<RenderDisplayObjectParams, "obj"> & {
	obj: PIXI.Graphics;
};

export type RenderSpriteParams = Omit<RenderDisplayObjectParams, "obj"> & {
	obj: PIXI.Sprite;
};

export type BuildPathParams = Pick<RenderContainerToSkiaParams, "ck"> & {
	data: PIXI.GraphicsData;
};

export type HexToSkiaColorParams = Pick<RenderContainerToSkiaParams, "ck"> & {
	hex: number;
	alpha: number;
};

export type PointerHandler = (x: number, y: number) => void;

export type AttachPointerEventsParams = {
	canvas: HTMLCanvasElement;
	onDown: PointerHandler;
	onUp: PointerHandler;
};

export type SetupEventsParams = {
	pixiCanvas: HTMLCanvasElement;
	skiaCanvas: HTMLCanvasElement;
	container?: PIXI.Container;
	onInteract?: () => void;
};

export type ExportToPdfParams = {
	container: PIXI.Container;
	width: number;
	height: number;
};

export type RenderDisplayObjectToCtxParams = {
	ctx: Context2d;
	obj: PIXI.DisplayObject;
};
