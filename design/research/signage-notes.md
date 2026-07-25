---
title: "Вывеска: пластмасса + светящиеся буквы (study)"
status: draft
owner: visual-designer
updated: 2026-07-25
sources:
  - design/research/grid-and-lockup-standard.md
  - design/tokens.css
claims:
  - C-002
  - C-019
---

# Вывеска (не производство, design constraints)

## Решение владельца (working)

- Материал: **пластмасса** (объёмные буквы / короб)
- **Светящиеся** буквы + логотип
- Читаемость **днём издалека** важнее «красивого AI-лофта»
- Акцент (терракота/оранж) **чуть ярче** — день; ночь спасает подсветка

## Design rules

| | День | Ночь |
| --- | --- | --- |
| Фон фасада | графит / тёмный | тёмный |
| Буквы Chicken | светлый pastry / white | glow white-warm |
| Fit / акцент | terra яркий `#C95530`+ | glow `#FF6B35` |
| Mark | 1–2 color, крупный, food-read | silhouette + rim light |

## Distance test (мысленный)

На 25–40 м должно считываться:

1. **Еда** (форма сэндвича/миски/самсы — не абстрактный blob)  
2. **ChickenFit** wordmark  
3. Не «фитнес-клуб» и не «авиакассы»

## Макеты study

`design/assets/micro/r3/lockups/signage-day.svg`  
`design/assets/micro/r3/lockups/signage-night.svg`

## Ops later

Тип подсветки (LED face-lit / halo), толщина букв, крепление — **не design-core**; эскалация ops после утверждения lockup.
