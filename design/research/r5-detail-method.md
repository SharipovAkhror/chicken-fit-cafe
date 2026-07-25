---
title: "R5.1 detail craft — метод слоёв (не slop)"
status: draft
owner: visual-designer
updated: 2026-07-25
sources:
  - design/craft-standards.md
  - design/research/competitor-reference-board.md
  - design/research/r5-owner-brief.md
  - https://www.shutterstock.com/search/karaage-chicken?image_type=vector
claims:
  - C-019
  - C-020
---

# R5.1 — как наращивать детализацию (сначала думать)

Owner: «ещё варианты, **побольше детализации**».  
R5 flat marks — база. Здесь — **depth craft**, не «накидать штрихов».

## Урок из референсов

| Источник | Метод | Берём | Не берём |
| --- | --- | --- | --- |
| **Karaage JP flat** | неровная корочка, топ-view / ¾, лимон/зелень точкой | irregular crust edge, 1 garnish | фотошум, 12 цветов |
| **US chicken sandwich vectors** | слои с **разным** профилем края (bun ≠ chicken ≠ leaf) | layer grammar | glossy 3D CGI |
| **Raising Cane / product-led** | один hero-продукт, мало декора | strips / piece as hero | badge clutter |
| **MOS / JP packaging** | воздух, 4 ink max, сила силуэта | restraint after detail | sakura kit |

## 7 слоёв детализации (порядок работы)

```
1 SILHOUETTE   — 1 fill, 32px читается
2 SECONDARY    — bun halves, bowl rim, bone, box flaps
3 VOLUME       — solid mid-tone shapes (opacity 25–40%), НЕ gradient
4 HIGHLIGHT    — 1–2 specular curves (juicy)
5 TEXTURE      — organic crackle paths (короткие, разной длины)
6 MICRO        — sesame 3–5 / herb / sauce drip / steam 2–3
7 OPTICAL      — center, gap, mono re-check
```

Если после 5–6 mono ломается — **срезать**, не «добавлять ещё».

## Что значит «больше детализации» у нас

| Да | Нет |
| --- | --- |
| Разные edge profiles на слоях | Параллельные grill-штрихи (tabaka) |
| Karaage-style bumpy crust | Фото-grain, noise filter |
| Leaf с прожилками (1–2) | Радуга овощей |
| Sauce drip + fiber waves | Glow / drop-shadow 3D |
| 2 ink + pastry bg | 5+ brand colors in mark |

## Варианты R5.1 (план)

| ID | База R5 | Detail-жест |
| --- | --- | --- |
| m01d | sandwich | 5 layers + sesame + drip + leaf vein |
| m02d | bowl | rice suggestion + 3 chicken chunks + steam + rim |
| m04d | piece | karaage edge bumps + bone socket + crackle net |
| m06d | box | kraft folds + 2 pieces + lid score |
| m07d | strips | jagged fried edges + individual grain + herb |
| m08 | new | **karaage cluster** (JP product, 3 nuggets) |
| m09 | new | **cross-section sandwich** (разрез, читаемость еды) |
| m10 | new | **wrap / roll** (takeaway local) |

Food art detail: те же слои, крупнее canvas, больше crackle, без кругов-тарелок как героя.

## Checklist перед export

- [ ] Mono 64×64 читается  
- [ ] ≤2 ink (+ bg)  
- [ ] Нет grill hatch  
- [ ] Нет cartoon eye  
- [ ] С 0.3 с = **еда из курицы**  
