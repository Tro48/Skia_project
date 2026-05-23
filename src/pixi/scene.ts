import * as PIXI from "pixi.js-legacy";

export interface Scene {
  app: PIXI.Application;
  container: PIXI.Container;
}

export function createPixiApp(mountEl: HTMLElement): Scene {
  const app = new PIXI.Application({
    width: 400,
    height: 300,
    backgroundColor: 0x16213e,
    forceCanvas: true, // включает Canvas2D-рендерер
    antialias: true, // сглаживание
  });
  mountEl.appendChild(app.view as HTMLCanvasElement);

  const container = new PIXI.Container();
  app.stage.addChild(container);

  return {
    app, // Pixi-приложение
    container, // корневой узел сцены
  };
}

export function populateScene(container: PIXI.Container): void {
  container.removeChildren();
  const count = 4 + Math.floor(Math.random() * 5); // 4–8 фигур

  for (let i = 0; i < count; i++) {
    container.addChild(createRandomShape());
  }
}
function createRandomShape(): PIXI.Graphics {
  const g = new PIXI.Graphics(); // создаем холст
  const fillColor = Math.random() * 0xffffff; // случайный цвет
  const strokeColor = Math.random() * 0xffffff;
  g.lineStyle(4, strokeColor, 1);
  g.beginFill(fillColor, 0.7);
  const type = Math.floor(Math.random() * 3); // случайное число от 0 до 2 которое соответствует типу фигуры
  switch (type) {
    // прямоугольник
    case 0: {
      const w = 40 + Math.random() * 80;
      const h = 30 + Math.random() * 60;
      g.drawRect(0, 0, w, h); // рисуем прямоугольник от точки (0, 0) до (w, h)
      break;
    }
    // круг
    case 1: {
      const r = 20 + Math.random() * 40;
      g.drawCircle(0, 0, r); // рисуем круг в центре холста
      break;
    }
    // треугольник
    default: {
      const size = 30 + Math.random() * 50;
      g.moveTo(0, -size); // вершина
      g.lineTo(size * 0.866, size * 0.5); // правый угол
      g.lineTo(-size * 0.866, size * 0.5); // левый угол
      g.closePath(); // закрываем фигуру
    }
  }
  // Завершает заливку. Без этого вызова фигура может не отобразиться корректно в Pixi.
  g.endFill();
  // Трансформации для воспроизведения Skia-рендерера
  g.x = 30 + Math.random() * 320;
  g.y = 30 + Math.random() * 240;
  g.rotation = Math.random() * Math.PI * 2;
  g.scale.set(0.5 + Math.random() * 1.5);
  return g;
}
