# Pixi.js + Skia (CanvasKit) — тестовое задание

Приложение на TypeScript, которое:
- Рендерит сцену `PIXI.Container` на двух канвасах одновременно: через **Pixi.js** (canvas 2D) и через **Skia / CanvasKit WASM**
- Экспортирует сцену в **векторный PDF** (через `jsPDF.context2d` — каждый примитив становится PDF-путём, не растровым изображением)
- Поддерживает интерактивные события `pointerdown` / `pointerup` на объектах обоих канвасов

---

## Технологии

| Пакет | Версия | Назначение |
|-------|--------|-----------|
| `pixi.js-legacy` | `^7.2.4` | Рендер сцены на canvas-2D |
| `canvaskit-wasm` | `^0.41.1` | Skia WASM: параллельный рендер Pixi-контейнера |
| `jspdf` | `^4.2.1` | Векторный PDF-экспорт через `context2d` |
| `vite` | `^8` | Сборщик |
| `vitest` | `^4` | Тесты |
| `typescript` | `^6` | Язык |

---

## Требования

- **Node.js** ≥ 18 (требуется для Vite 8)
- npm ≥ 9

---

## Установка и запуск

```bash
# Установить зависимости
npm install

# Запустить dev-сервер (открыть http://localhost:5173)
npm run dev

# Собрать продакшн-бандл
npm run build

# Предпросмотр продакшн-сборки
npm run preview
```

---

## Запуск тестов

```bash
# Запустить тесты однократно
npm run test:run

# Запустить в watch-режиме
npm run test
```

---

## Структура проекта

```
src/
├── main.ts                  # Точка входа: инициализация, UI-обработчики
├── types.ts                 # Все TypeScript-типы и интерфейсы
├── events.utils.ts          # Pointer-события и hit-testing на Skia canvas
├── pixi/
│   └── scene.ts             # createPixiApp, createExampleScene, populateScene
├── skia/
│   ├── init.ts              # initCanvasKit (singleton WASM-загрузчик)
│   ├── renderer.ts          # renderContainerToSkia — точка входа рендера
│   └── renderer.utils.ts   # renderDisplayObject, buildPath, renderSprite
├── pdf/
│   └── exporter.ts          # exportToPdf — векторный PDF через jsPDF.context2d
└── styles/
    ├── reset.css
    └── main.css
```

---

## Интерфейс

| Кнопка | Действие |
|--------|---------|
| **Пример из ТЗ** | Загружает детерминированную сцену: эллипс (g1), прямоугольник (g2), две линии (g3, g4) с трансформациями и событиями |
| **Случайные фигуры** | Генерирует 4–8 случайных фигур (прямоугольники, круги, треугольники) |
| **Экспорт в PDF** | Скачивает `scene.pdf` — векторный PDF текущей сцены |

На каждом канвасе работают события: клик на фигуру в примере из ТЗ выводит в консоль `g1 pointerdown!` / `g2 pointerup!`.

---

## Архитектурные решения

### Обёртка Skia для PIXI.Container

`renderContainerToSkia` обходит дерево `DisplayObject`-ов рекурсивно, применяя аффинную матрицу `T(pos) · R · S · T(-pivot)` через `canvas.concat(matrix)`. Поддерживаются:
- `PIXI.Graphics` → Rectangle, Ellipse, Circle, Polygon (moveTo/lineTo)
- `PIXI.Sprite` → SkImage из пикселей временного canvas

### Векторный PDF

`exportToPdf` использует `jsPDF.context2d` — canvas-like API, который транслирует `save/restore/transform/arc/rect/moveTo/lineTo` напрямую в PDF path-операторы. Результат — настоящие векторные пути, не PNG в PDF.

### Hit-testing на Skia canvas

При клике на Skia canvas функция `hitTest` обходит контейнер в обратном z-порядке, проверяет world-space AABB (`getBounds()`) каждого объекта и вызывает `emit('pointerdown'/'pointerup')` на найденном объекте.
