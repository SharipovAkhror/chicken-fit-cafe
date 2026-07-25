---
title: "R4 brief: owner feedback + craft reset"
status: draft
owner: visual-designer
updated: 2026-07-25
sources:
  - design/assets/reference/facade/facade-empty.jpg
  - design/assets/reference/facade/facade-empty.jpg
  - design/research/type-candidates.md
  - design/research/competitor-reference-board.md
  - design/craft-standards.md
claims:
  - C-019
  - C-020
  - C-022
---

# R4 — brief владельца (2026-07-25)

Это **вход для craft-раунда**, не финал. AI-мок на фасаде — только идея
композиции; исполнение **reject**.

## 1. Type

| | |
| --- | --- |
| Lock display | **T4 Bricolage Grotesque** — основное исполнение логотипа |
| Тест word | **CHICKEN** в духе **KFC lettering** (метод, не клон) |
| Fit | остаётся в системе T4 / dual-color |

**KFC-метод (что берём, не логотип):**

- тяжёлые caps, слегка condensed;
- «chicken QSR energy» — уверенно, аппетитно, без crypto-tech;
- исторически: slab / American Typewriter–adjacent, bold; italic на «C» в
  старых версиях — **опциональный** характерный жест;
- **не** копируем Colonel, bucket, red/white KFC pack, Friz Quadrata as-is.

Артефакты R4: **purged** → active `design/assets/micro/r5/wordmarks/`.

## 2. Marks — kill / keep

| ID R3 | Мотив | Вердикт |
| --- | --- | --- |
| m03 crest (голова курицы) | bird head | **KILL** |
| m05 samsa | самса | **KILL** |
| m01 sandwich | сэндвич / layers | keep → **перерисовать** |
| m02 bowl | миска / обед | keep → **перерисовать** |
| m04 fillet | филе / grill | keep → **перерисовать** |
| m06 box | бокс takeaway | keep → **перерисовать** |
| m07 bite-badge | badge + bite | keep → **перерисовать** |

Проблема R3 (owner): идеи ок, **исполнение slop** — «багованные» кривые,
прямоугольники вместо еды, нет optical craft.

### Craft rules R4 (обязательно)

1. **Только path / ellipse** — никаких «лесенок» из `rect` как слоёв еды.
2. Кривые **Bezier** с осмысленными handles (мало узлов, ровный silhouette).
3. Сначала **1-цветный силуэт** 64×64, потом detail.
4. 1–2 ink (+ pastry bg). Без градиентов, glow, 3D.
5. Узнаваемость «еда» с 25 м (вывеска) и в 32 px (аватар).
6. Перед каждым кругом — **подглядывать** в competitor board (JP / RU / US).

### Инструменты (как работают дизайнеры)

| Слой | Практика |
| --- | --- |
| Vector craft | Illustrator / Figma / Penpot — pen tool, pixel preview, outline |
| SVG hygiene | SVGOMG, svgo; единый viewBox; no inline junk |
| Path math | paper.js / opentype.js (lettering) / Inkscape node editor |
| Icons micro | Lucide / Phosphor / Heroicons — **только** slogan strip, не mark |
| Grid | 8 px optical; lockup gap 8 px (R3) |

В репо: hand-crafted SVG paths. Финальный polish — в Figma/Illustrator после
отбора owner.

## 3. Фасад и баннер

| | |
| --- | --- |
| Пустой фасад | `design/assets/reference/facade/facade-empty.jpg` |
| AI-мок (reject) | **deleted** from repo (execution kill) |
| Зона вывески | верхнее окно / проём над дверями |
| Размер | **2 м × 1 м** (W×H) → aspect **2:1** |
| Фон баннера | **белый / pastry-white**, не чёрный AI-glow |
| Идея AI (keep) | photo food слева + brand справа + strip слоганов снизу |
| Исполнение AI | kill: cartoon rooster, yellow glow, stock 3D chicken |

### Зоны баннера (working)

```
┌──────────────────────────────────────────────────────────┐
│  A Food art (~40–50%)     │  B Brand (~50–60%)           │
│  аппетитная курица        │  mark + ChickenFit (T4)      │
│  flat / JP-clean style    │  dual color Chicken / Fit    │
├───────────────────────────┴──────────────────────────────┤
│  C Strip: [ico] сочная · [ico] свежая · [ico] сытная     │
└──────────────────────────────────────────────────────────┘
```

- **C:** микро-иконки (простые line/fill из качественного open set). Не
  заморачиваться — контекстные, читаемые. Не mark-система.
- **A:** рисованная еда (не фотосток, не AI CGI). Два стиля-теста:
  **JP-clean** (плоско, мало деталей, сильный silhouette) и
  **QSR-clean** (чуть больше текстуры, хруст, соус — всё ещё vector).

### Психо-триггеры (Самарканд, не «метро-лофт»)

| Триггер | Как в картинке |
| --- | --- |
| Тепло / «поем» | terracotta + pastry, тёплый свет, не cold blue |
| Сочность | highlight + sauce drip, не «сухой» outline |
| Хруст | короткие hatch / crackle на корочке, без фотошума |
| Порция | 2–3 куска / stack, не одинокий «диетический» кусок |
| Свежесть | лёгкий пар / зелень-точка (не радуга) |
| Понятность | за 0.3 с: «это еда из курицы», не fitness, не авиа |

Не ultra-cartoon (глаза, улыбка) и не photoreal. **Чуть проще и стильнее
реализма** — flat illustration с аппетитом.

## 4. Порядок R4

1. Competitor board refresh (всегда рядом).
2. Kill crest + samsa в каталоге.
3. R4 marks (5 survivors) — silhouette first.
4. Wordmarks: T4 lock + K1 CHICKEN test.
5. Food-art A1 (JP) / A2 (QSR-clean).
6. Banner 2×1 layout + strip.
7. Gallery R4 → голос owner (♥ ~ ×).

## 5. Запреты (накоплено)

- AI-slop как финал  
- Letter/seal primary, 3 strips  
- Голова курицы / samsa mark  
- Olive в лого  
- Чёрный neon AI banner как бренд  
- Cartoon rooster с гантелей / вилкой  
