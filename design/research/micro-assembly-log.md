---
title: "Журнал micro-assemblies round 1"
status: draft
owner: visual-designer
updated: 2026-07-25
sources:
  - design/research/case-board.md
  - design/research/anti-slop-board.md
  - design/assets/micro/catalog.json
claims:
  - C-019
  - C-020
  - C-022
---

# Micro-assemblies — round 1

**Цель раунда:** много черновых жестов, не финал.  
**Галерея R3:** ~~gallery-r3.html~~ — **purged** (see R5.2).

## Объём

| Тип | Кол-во | Путь |
| --- | --- | --- |
| Mark micro | 28 | `design/assets/micro/marks/*.svg` |
| Type pairs | 8 | секция Type в gallery |
| Color core + vars | 4 + 6 | секция Color |
| Research boards | 5 | `design/research/*` |

## Семьи mark

| Family | IDs | Смысл |
| --- | --- | --- |
| A Product | a01–a05 | форма/разрез/fold |
| B Bowl | b01–b03 | сосуд / обед |
| C Bird | c01–c04 | гребешок / профиль |
| D Letter | d01–d04 | C / CF / word |
| E Seal | e01–e04 | JP stamp / enso |
| F Strip | f01–f03 | белок / grill |
| G Hybrid | g01–g04 | local×JP |

## Как смотреть (владелец)

1. Открой gallery-r3.html  

2. Пройди **только marks** 5–10 минут  
3. Выпиши ID: keep / maybe / kill  
4. Не объясняй «почему красиво» — достаточно «да/нет/чуть»  
5. Type: отметь 1–2 пары  
6. Color: V1–V6 — что ближе на глаз  

## Уже отбраковано до раунда

- Три полоски как primary  
- Social CF-avatar pack v1  
- AI packaging as spec  

## Round 2 (после feedback)

| Feedback | Сделано |
| --- | --- |
| Letter + seal фигня | Families D/E **killed** |
| Передумать icons | 18 marks A/B/C/F/G на 8px grid, max 2 ink |
| T2 T4 T7 | shortlist in gallery-r3 |
| Colors keep + pastry lighter | `#F7F1E6`, olive out of logo |
| Rainbow | marks 1–2 colors only |
| Icon+text / Amazon-style | lockups L1 + wordmark clever W01–W05 |
| Grid standard | `grid-and-lockup-standard.md` |

**Галерея R3:** `design/assets/micro/gallery-r3.html`

## Round 3 (после R2 votes)

- Outline real T2/T4/T7 in wordmarks (not Arial placeholder)  
- 16px + kraft mono stress  
- 2–3 finalist systems only  
- Cyrillic menu strip  

## Round 4 (owner 2026-07-25) — craft reset → **REJECT**

| Feedback | Сделано | Owner after view |
| --- | --- | --- |
| T4 lock | wordmark T4 | keep T4, fix delivery |
| CHICKEN like KFC | K1 paths | **reject** — «другую вещь» |
| Detail craft | Bezier marks | **reject** — «не похоже на курицу» |
| Facade 2×1 white | banners | strip icons uneven |
| Food art | JP/QSR | **reject** — «гриль/табака», чертить |
| Pastry | `#FAF7F0` | **too yellow** → near-white |

Brief R4: `design/research/r4-owner-brief.md`  
Archive: `design/assets/micro/r4/*`, `gallery-r4.html`

## Round 5 (owner reject R4) — craft redo

| Feedback | Сделано |
| --- | --- |
| Фон ближе к белому | tokens pastry `#FDFCF9` |
| Marks full redraw | m01 sandwich, m02 bowl, m04 piece, m06 box, m07 strips |
| Food not grill | JP-drawn waves + appetite strips stack |
| Strip icons one line | 28×28 symbols, shared baseline on banner |
| T4 keep | `wm-t4-chickenfit.svg` Bricolage web font |
| K1 redo | condensed slab energy, custom paths |
| Gallery | `gallery-r5.html` |

Brief: `design/research/r5-owner-brief.md`

## Round 5.1 — more variants + detail (owner: «побольше детализации»)

| | |
| --- | --- |
| Method first | `r5-detail-method.md` — 7 layers craft |
| Detail upgrades | m01d…m07d in `r5/marks-detail/` |
| New concepts | m08 karaage · m09 cross-section · m10 wrap |
| Food detail | `fa-karaage-plate.svg` |
| Gallery | `gallery-r5-detail.html` (+ flat compare) |

## Round 5.2 — poster hero + purge

| Feedback | Сделано |
| --- | --- |
| Logo mark cartoon OK | keep marks language |
| Poster = obvious juicy chicken | `fa-hero-chicken.svg` (fibers, crust, bone, cut face) |
| Banner | `banner-2x1-poster.svg` |
| Clean repo | **deleted** r3/, r4/, gallery-r3/4, AI facade reject, weak food-art |
| Active only | `r5/*` + gallery-poster / r5 / r5-detail |

## Ценность этапа

Не «получить лого».  
Получить **карту вкуса** + архитектуру (mark / word / lockup / clever).
