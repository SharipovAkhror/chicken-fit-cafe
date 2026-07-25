# Chicken Fit Cafe — статус проекта

**Обновлено:** 2026-07-25 · **Владелец:** SharipovAkhror  
**Репозиторий:** https://github.com/SharipovAkhror/chicken-fit-cafe  
**Локальный путь (канон):** `Documents/GitHub/chicken-fit-cafe`

> **Новому агенту:** этот файл → `AGENTS.md` → `strategy/project-map.md` → `knowledge/claims.yaml`.  
> Сейчас активна **только роль visual-designer**. Не генерировать AI-slop как финал.

---

## Где мы

| | |
|---|---|
| **Фаза** | **Research-only** (без генерации лого/брендбука) |
| **Активная роль** | `visual-designer` |
| **Северная звезда** | Fast-casual у аэропорта Самарканда; курица + бургер-самса |
| **Remote** | `origin` → `SharipovAkhror/chicken-fit-cafe` |

## Feedback владельца (2026-07-25) — обязательно

- Ассеты pack v1 / AI-борды: «прикольно, но видно, что AI» → **не финал**.
- **Три полоски как иконка / social avatar — reject.**
- Цвета (терракота, pastry, тёплый «жёлтый» свет) — **примерно ok**, держим.
- Упаковка: не fancy mockups, а **простые картонные бланки** (реальные UZ/СНГ), белые/крафт → утверждение → потом лого.
- Логотип: wordmark ChickenFit ок как имя; **нужна своя иконка** (курица / bowl / strips / product).
- Цель: **брендбук** (PDF + Canva) + постеры, баннеры, наклейки.
- Canva Pro у владельца — Brand Kit вручную; полный API autofill = Enterprise.

## Подтверждённое ядро

- C-001…C-003, C-012…C-017, C-019, C-020, C-021, C-022 (имя ChickenFit)
- Harness ADR-003 готов

## OPEN — design (порядок студии)

### 1. 🔴 Сейчас — micro R2 (после cull feedback)

**Не финал.** Letter/seal убиты. Сетка 8px · lockups · clever wordmark.

| Что | Где |
|---|---|
| **Галерея R2** | `design/assets/micro/gallery-r2.html` |
| Marks + mono | `design/assets/micro/r2/marks/` |
| Lockups / wordmarks | `r2/lockups/`, `r2/wordmarks/` |
| Стандарт сетки | `design/research/grid-and-lockup-standard.md` |
| Type keep | **T2, T4, T7** |
| Color | core + pastry **#F7F1E6** lighter |

Действие: gallery-r2 → ♥ ~ × → export votes.

### 2. Потом (после research + выбор характера)

1. Направления вкуса J1–J4 → выбор владельца  
2. Mark + type + color lock  
3. Brandbook  
4. Крафт-носители  
5. Canva — опционально  

### 3. Упаковка / Canva — не сейчас

- Крафт default; box/wrap later  
- Canva: **решение не принимаем**; проект идёт без него

### 4. Снято / не использовать как финал

| Артефакт | Статус |
|---|---|
| `logo-mark.svg` / social с 3 полосками | reject as primary |
| `packaging-system.png` AI board | mood only, не spec |
| design pack v1 three-line module as icon | superseded by marks-v2 |

PR #2 (design pack v1) — пересобрать под craft pivot или закрыть частичным.

## Запреты

- Архив Gemini — не факты
- AI не `approved` на имя/лого/бренд
- Секреты не в git
- Не штамповать «три полоски» обратно без ADR
