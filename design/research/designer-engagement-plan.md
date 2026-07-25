---
title: "Как привлечь дизайнера в ChickenFit (операционная модель)"
status: draft
owner: system-architect
updated: 2026-07-25
sources:
  - design/craft-standards.md
  - design/research/r5-owner-brief.md
  - design/research/competitor-reference-board.md
  - STATUS.md
  - https://www.behance.net/hire
  - https://dribbble.com/designers
  - https://www.upwork.com/hire/brand-identity-designers/
claims:
  - C-019
  - C-020
  - C-022
---

# Дизайнер в проект — не «ещё один SVG-раунд»

## 1. Честный диагноз

| Кто | Что умеет хорошо | Что не умеет / дорого ошибаться |
| --- | --- | --- |
| **AI-агент (Grok в репо)** | система, brief, токены, отбор, документация, review, git/PR | финальный craft лого и «сочная курица» path’ами |
| **«Дизайнерская LLM» / Canva Magic / Looka** | mood, вариации, layout носителей | уникальный identity, cultural fit Samarkand, optical craft |
| **Человек brand/food designer** | pen tool, lettering, food-art, вывеска в мире | нужен **чёткий brief + решения owner** |

**Вывод:** «Найти дизайнерскую LLM вместо дизайнера» — **нет**.  
Правильная модель 2026: **человек = craft + вкус**, AI = **ускорение и система**.

Владелец хочет «всё и правильно». Это значит не 50 micro-раундов, а:

1. Зафиксировать требования (уже почти есть).  
2. Нанять **одного** дизайнера под **узкий scope**.  
3. Агента оставить **арт-директором / продюсером / ревьюером** в git.

---

## 2. Роли (разделение личностей — да, но не «два LLM рисуют»)

```
OWNER (ты)
  ├─ решения: ♥/~×, бюджет, approve final
  │
AGENT (я, в репо)  ← «creative producer + system architect»
  ├─ brief, shortlist refs, tokens, checklists
  ├─ review deliverables vs craft-standards
  ├─ STATUS / ADR / claims
  └─ НЕ финальный painter лого/food
  │
DESIGNER (человек, Figma/Illustrator)
  ├─ mark + wordmark + lockup (vector)
  ├─ poster hero chicken (photo retouch OR illustration)
  ├─ banner 2×1 mock on facade photo
  └─ mini brand kit (colors, type, do/don't)
```

Опционально **вторая «личность» агента** = только review-persona:

- *Producer:* готовит brief, ищет кандидатов, чеклист.  
- *Critic:* сверяет файлы дизайнера с anti-slop и owner rules.  

Оба — **текстом и процессом**, не path soup.

---

## 3. Где искать дизайнера (практика)

### A. Глобальный food / brand craft (качество)

| Канал | Зачем | Как фильтровать |
| --- | --- | --- |
| **Behance Hire** | портфолио food/restaurant branding | 3+ кейса food, vector logo, не только Canva social |
| **Dribbble Designers** | сильный visual, InstantMatch brief | «brand identity» + «food» в работах |
| **Upwork** | контракт, milestone, escrow | portfolio review call 15 мин |

### B. Регион (язык, цена, вывеска UZ)

| Канал | Зачем |
| --- | --- |
| **Upwork · Uzbekistan / Tashkent** | локальные rates, русский/узбекский |
| **Behance · Uzbekistan** | студии/фриланс Ташкент |
| Telegram / Instagram design communities UZ/RU | быстрый контакт; договор и ТЗ — всё равно письменно |

### C. Узкий specialist (если logo и food раздельно)

| Задача | Кого |
| --- | --- |
| Logo + system | Brand identity designer |
| Сочная курица на плакат | Food illustrator **или** food photographer + retoucher |

**Рекомендация:** сначала **один** generalist brand designer, в scope: logo + banner mock;  
food photo — stock/photo day **или** отдельный illustrator, если drawn обязателен.

---

## 4. Бюджетные вилки (ориентир, не оферта)

| Пакет | Scope | Ориентир* |
| --- | --- | --- |
| **Sprint S** | 1 mark + lockup + wordmark, 2 revision | $150–400 |
| **Sprint M** (рекомендуем старт) | S + banner 2×1 on facade + mini guidelines PDF | $400–900 |
| **Sprint L** | M + packaging stamp + social kit + day/night signage | $900–2000+ |

\*Рынок фриланса 2025–26 сильно плавает; смотреть portfolio, не «дешёвый лого за $5».  
Fiverr $5–20 logo packs — **anti-pattern** для этого проекта (будет slop).

Owner утверждает бюджет → агент готовит post/brief → owner пишет 5–8 кандидатам.

---

## 5. Что НЕ отдаём дизайнеру «как финал»

- R5 SVG marks как «сделай так же»  
- AI facade mock как execution  
- Требование «нарисуй 40 вариантов в git за ночь»

**Отдаём как research / constraints:**

- tokens (pastry near-white, terra, graphite)  
- T4 Bricolage primary  
- kill list (crest, samsa, 3 strips, Colonel, olive in logo)  
- competitor board JP/RU/US (method only)  
- facade-empty.jpg  
- owner votes language: ♥ ~ ×  

Дизайнер **может** вдохновиться R5, но **не обязан** доводить agent paths.

---

## 6. Scope v1 для найма (одно предложение)

> **ChickenFit (Samarkand fast-casual chicken):**  
> vector logo system (mark + ChickenFit wordmark T4 energy + lockup light/dark)  
> + facade banner 2×1 m white (obvious juicy chicken visual + brand + slogan strip)  
> mockup on provided facade photo.  
> 2 rounds of revision. Source files (AI/SVG/PDF).  
> No cartoon gym rooster, no KFC clone, no letter-seal icon.

Deliverables checklist:

- [ ] Logo mark SVG (+ mono)  
- [ ] Wordmark SVG (Chicken / Fit dual color)  
- [ ] Lockup horizontal + stack  
- [ ] Banner 2×1 print-ready PDF + source  
- [ ] Facade mock (empty photo)  
- [ ] 1-page do/don't + color/type note  
- [ ] Optional: food hero (photo-based OR illustration — specify in contract)

---

## 7. Процесс найма (7–10 дней, без burn токенов)

| День | Owner | Agent |
| --- | --- | --- |
| 0 | Утвердить budget package S/M/L | Зафиксировать в STATUS |
| 1 | — | Готовый **Designer Brief PDF/MD** + post text RU/EN |
| 2–3 | Разослать 8–12 кандидатам (Behance/Upwork/local) | Shortlist criteria sheet |
| 4 | 3 созвона 15 мин | Вопросы для созвона |
| 5 | Выбрать 1 + milestone 50/50 | Contract checklist (IP, source files) |
| 6–10 | ♥/~× на 2 раунда | Review vs craft-standards, anti-slop |
| 11 | Approve | Import finals в `design/assets/final/`, ADR, claims |

**Правило агента:** пока идёт найм — **не** открывать R6 micro-assembly.  
Repo freeze на experimental marks.

---

## 8. Как «обучаться в интернете» правильно (агент)

Не «ещё 20 иконок», а **библиотека критериев**:

1. Раз в задачу — 3 ref с Behance food brand (method notes, not copy).  
2. Review дизайнера только по checklist (silhouette, 32px, 25m, no kill-list).  
3. Lettering: T4 lock; K1 only if designer proposes custom paths with rationale.  
4. Food: photo pipeline preferred; illustration only if portfolio shows real food craft.

«Дизайнерская LLM» (Midjourney/Ideogram/Canva) — **только** moodboard внутри brief или у дизайнера в черновике. Не в `approved`.

---

## 9. Риски

| Риск | Митигация |
| --- | --- |
| Дешёвый лого-маркет | Min portfolio: 2 food brands; reject packs |
| Дизайнер игнорит UZ/context | Facade photo + Samarkand in brief |
| Owner «ещё чуть-чуть» forever | Max 2 revisions in contract |
| Агент снова рисует SVG | STATUS: freeze experimental craft |
| IP / source files | Milestone: AI + SVG + PDF before final pay |

---

## 10. Решение владельца (нужны 3 ответа)

1. **Бюджет-пакет:** S / M / L (или своя сумма)  
2. **География поиска:** global craft / UZ-RU / оба  
3. **Food на плакате:** photo-based / drawn illustration / hybrid  

После ответов агент делает **только**:

- `design/handoff/designer-brief.md` (полный brief)  
- post text для Upwork/Behance (RU + EN)  
- scorecard 10 кандидатов (когда owner пришлёт ссылки **или** попросит помочь искать — поиск ссылок с owner OK)

**Не делает:** новый gallery R6, hero SVG v12.
