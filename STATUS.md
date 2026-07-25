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
| **Фаза** | Этап 0 — ОС проекта (публикация + harness) |
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

## OPEN — handoff

### 1. ✅ Remote + harness (2026-07-25)

- Репозиторий: `chicken-fit-cafe`
- Vendor-стабы: `CLAUDE.md`, `GEMINI.md`, `GROK.md`, `.github/copilot-instructions.md` → `AGENTS.md`
- CODEOWNERS: `@SharipovAkhror`
- CI: `.github/workflows/validate.yml` → `node tools/validate.mjs`

### 2. 🔴 Следующий приоритет — первый цикл issue → PR

1. Создать issue по шаблону (например fact-check или research).
2. Ветка `type/issue-id-short-description`.
3. PR + зелёный CI + human approval.

### 3. Этап 1 — верификация бизнеса

- CustDev / полевая проверка C-004…C-007 (needs-verification)
- Уточнение помещения у аэропорта
- Продуктовые тесты способа приготовления курицы (C-018)

## Запреты (коротко)

- Архив `archive/gemini/` — только гипотезы, не факты
- AI не переводит критичное в `approved`
- Секреты, ПДн, токены — не в git
- Push/публикация/оплата/договор — только с явным «да» владельца (кроме уже согласованного ведения этого remote)
