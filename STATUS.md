# Chicken Fit Cafe — статус проекта

**Обновлено:** 2026-07-25 · **Владелец:** SharipovAkhror  
**Репозиторий:** https://github.com/SharipovAkhror/chicken-fit-cafe  
**Локальный путь (канон):** `Documents/GitHub/chicken-fit-cafe`

> **Новому агенту:** начни с этого файла → `AGENTS.md` → `strategy/project-map.md` → `knowledge/claims.yaml`.  
> Не полагайся на память прошлой сессии. Не повторяй уже сделанное.

---

## Где мы

| | |
|---|---|
| **Фаза** | Дизайн-система v1 (после арт-дирекции) |
| **Активная роль** | `visual-designer` |
| **Северная звезда** | Проверяемый запуск fast-casual кафе (куриное ядро, «бургер-самса») у аэропорта Самарканда |
| **Источник истины** | Этот git-репозиторий + GitHub issues/PR |
| **Remote** | `origin` → `SharipovAkhror/chicken-fit-cafe` |

## Подтверждённое ядро (не перепроверять без причины)

- Формат: **fast-casual** (C-001)
- Зона: **аэропорт Самарканда** (C-002; конкретное помещение — нет)
- Продукт: **курица + гибрид бургер/самса** (C-003)
- Каналы старта: **зал + навынос + доставка** (C-013)
- Позиционирование: **современный локальный сытный обед Самарканда** (C-019)
- Визуальный мир: **слои A + характер C** (C-020)
- 6 AI-ролей, русский язык, claims/ADR (C-009…C-011)
- Harness remote: **ADR-003 / C-021** (готово)

## Готово по дизайну (не переделывать)

| Артефакт | Статус | Путь |
|---|---|---|
| Три визуальных направления | approved | `design/visual-directions.md` |
| Арт-дирекция «Слой + Гостеприимство» | approved | `design/approved-art-direction.md` |
| Брендбук v1 (ChickenFit) | approved | `brand/BRANDBOOK.md` |
| Концепт-борды / упаковка / вывеска | draft-assets | `design/assets/*.png` |
| Стратегия бренда | approved | `brand/brand-strategy.md` |

## OPEN — handoff

### 1. 🟡 Issue #1 — design pack v1 (ветка `feat/1-design-pack-v1`)

https://github.com/SharipovAkhror/chicken-fit-cafe/issues/1

В работе / в PR:

1. Векторный логотип ChickenFit + mono + mark CF + favicon + social.
2. `design/design-system.md` синхронизирован (без placeholder `BRAND`).
3. Claim **C-022** (имя ChickenFit).
4. `design/tokens.css` + маппинг в `app/globals.css` + preview `app/page.tsx`.

Остаётся на human review: `approved` дизайн-системы, обводка Unbounded→path, PNG batch, доменная/юр. проверка имени.

### 2. Следом (не блокирует pack v1)

- Товарное имя флагманского продукта (бургер-самса).
- Проверка шрифтов Unbounded/Manrope на узбекскую латиницу + кириллицу.
- CustDev / полевая проверка C-004…C-007 (Этап 1).
- Продуктовые тесты курицы (C-018).

### 3. Этап 0 harness — ✅

Remote, vendor-стабы, CODEOWNERS, labels, CI validate — закрыто (ADR-003).

## Запреты (коротко)

- Архив `archive/gemini/` — только гипотезы, не факты
- AI не переводит критичное в `approved` (имя, финальный логотип, бренд → human)
- Секреты, ПДн, токены — не в git
- Не копировать старую айдентику (C-008 = rejected); ChickenFit в брендбуке — **новое** решение с переопределением «Fit = подходит», не диета
- Push/оплата/договор — только с явным «да» владельца (кроме согласованного ведения remote)
