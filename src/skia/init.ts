import CanvasKitInit, { type CanvasKit } from "canvaskit-wasm";

let _ck: CanvasKit | null = null;

export async function initCanvasKit(): Promise<CanvasKit> {
  if (_ck) return _ck; // синглтон — грузим WASM только один раз
  _ck = await CanvasKitInit({
    locateFile: (file: string) =>
      new URL(`../../node_modules/canvaskit-wasm/bin/${file}`, import.meta.url).href,
  }); // locateFile сообщает загрузчику, где лежит .wasm-файл
  return _ck;
}

export function getCanvasKit(): CanvasKit {
  if (!_ck) throw new Error("CanvasKit не инициализирован. Вызови getCanvasKit() первым.");
  return _ck;
}
