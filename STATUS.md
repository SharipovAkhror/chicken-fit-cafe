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
| **Фаза** | Brand identity craft — mark → brandbook |
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

### 1. 🔴 Сейчас — выбор mark M1–M4 (v2.1)

- `design/assets/marks-v2/compare.html` — все 4 иконки, color + mono  
- Карта слоёв: `design/system-map.md` (Brand Kit ≠ упаковка)  
- Canva API: `design/canva-integration.md` — «просто API key» **не** даёт вход в аккаунт

### 2. После mark → Brand Kit core

1. Доводка знака → wordmark → lockup → social  
2. Цвета + шрифты в Canva Brand Kit  
3. Носители (стикер, постер, баннер)  
4. Brandbook PDF  

### 3. Упаковка — слой Application, не сейчас

- Материал: **крафт** (working default)
- Коробка vs wrap: **решим после mark**
- Брендинг — стоп до лого

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
