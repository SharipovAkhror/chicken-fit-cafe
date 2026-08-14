---
title: "Claude Design — цепочка сессий (copy-paste)"
status: draft
owner: visual-designer
updated: 2026-07-26
sources:
  - design/prompts/utp-samsa-burger-pack.md
  - brand/BRANDBOOK.md
  - knowledge/claims.yaml
claims:
  - C-003
  - C-019
  - C-020
---

# Claude Design: как работать (оперативно)

## Режим (не 8 чатов)

| | |
|---|---|
| **1 тема = 1 чат** | Не открывать 8 чатов на одну тему |
| **1 сообщение = 8 вариантов** | Один master-prompt → batch 8 |
| **Refine в том же чате** | После ♥: «ещё 4–8 только в духе A3+A7» |
| **Новая тема = новый чат** | Не мешать hero и packaging |

### Цикл (3 минуты на раунд)

1. Новый чат → вставить **SYSTEM** + **SESSION N** целиком  
2. Получить 8 картинок  
3. Ты: `♥ 2 5 · ~ 1 · × rest`  
4. Refine 1 раз (опционально)  
5. Скачать ♥ → в `design/assets/reference/gen/` (или прислать агенту)  
6. Следующая сессия только после ♥

### Голос owner

```
♥ 2 5
~ 1
× 3 4 6 7 8
```

---

## SYSTEM (вставлять в КАЖДЫЙ чат первым)

```
Brand: ChickenFit Cafe — fast-casual chicken, Samarkand airport area.
Core product (must read in 0.3s): chicken burger hybrid inside flaky samsa-style dough; cross-section when relevant.
Languages:
- LOGO MARK: simplified, bold silhouette; slight cartoon OK if product-readable.
- POSTER / HERO FOOD: appetite first — juicy chicken, flaky layers, crumbs, steam, oil sheen. NOT logo.
Colors (working): pastry near-white #FDFCF9 or soft #F3E7D3; graphite #28211D; terracotta #B94D2F; olive #667447.
Kill forever: rooster/mascot head, KFC Colonel, red-white bucket language, 3 french-fry strips as logo, bare triangle samsa as only mark, grill/tabaka hatch look, AI glow, plastic CGI, cluttered collage, airplane/dome clichés.
Quality bar: studio food design / Japanese flat-appetite craft, not Midjourney wallpaper. Clear silhouette. One idea per frame. Production-usable, not moodboard noise.
Output: exactly 8 distinct variations labeled 1–8. Different composition/angle/gesture — not 8 near-duplicates. No text/watermark unless session asks for wordmark.
```

---

## SESSION 1 — UTP Hero 2:1 (разрез продукта)

**Чат:** `CF · S1 · UTP Hero`  
**Папка:** `design/assets/reference/gen/utp/hero/`

```
SESSION 1 — UTP HERO only (do not design logo, packaging, or storefront).

Aspect: 2:1 horizontal banner hero.
Subject: chicken burger sealed in flaky layered samsa-style pastry, SHOWN IN CROSS-SECTION so layers read: pastry → chicken patty/fillet → greens/sauce/cheese if subtle → pastry.
Outside: golden flaky layers, light pastry color near #FDFCF9–#F3E7D3, crisp flakes.
Inside: obvious chicken (fibers, crust, juicy), appetite, not abstract.
Background: clean warm off-white or soft paper; product is hero; minimal props (one crumb trail max).
Style: premium food photography + illustrated food-art hybrid; sharp, appetizing, readable at small web size.
Avoid: whole closed triangle with no interior; mascot; logo text; busy kitchen scene.

Generate 8 variations exploring:
1 vertical clean cross-cut center
2 ¾ angle bite-ready wedge open
3 stack emphasis (tall layers)
4 diagonal knife-cut reveal
5 soft fold open like envelope window
6 tight macro crust + chicken fiber
7 plate-present, slight shadow, still simple
8 graphic poster-ready flat lighting

Label 1–8. No brand wordmark yet.
```

**Refine (после ♥):**
```
Only winners: [N N]. Make 8 refined frames of those only.
Push: more chicken readability, flakier pastry, less CGI plastic, cleaner silhouette.
Keep 2:1. No logo text.
```

---

## SESSION 2 — UTP Mark 1:1 (иконка)

**Чат:** `CF · S2 · UTP Mark`  
**Старт после:** ♥ из S1 (можно 1 ref-картинку приложить)

```
SESSION 2 — LOGO MARK only (not poster photo, not packaging).

Format: 1:1 icon, must work at 32px and 128px.
Idea: simplified mark of the UTP — chicken-in-pastry / cross-section sandwich hybrid.
One semantic gesture only. Bold silhouette. Works in single color (terracotta #B94D2F on pastry #FDFCF9).
Slight cartoon simplification OK if product is obvious in 0.3s.
Deliver each concept as: (a) color on light (b) mono fill — if tool allows pairs; else color first, mono in refine.

Generate 8 mark directions:
1 vertical cross-cut badge
2 triangle shell + burger stack inside (NOT empty samsa)
3 rounded bite with layered edge
4 soft wrap / fold with window to chicken
5 diagonal wedge mark
6 box-like pastry with chicken core
7 abstract but still food-readable stack
8 bold stamp / seal of cross-section (no crest bird)

Kill: rooster, 3 strips, KFC, letters inside mark, fine hairlines that die at 16px.
Label 1–8.
```

**Refine:**
```
Winners [N N] only → 8 refinements.
Optimize: mono silhouette first, then color.
Thicker joints, fewer internal lines, optical balance for app icon + stamp.
```

---

## SESSION 3 — Lockup (знак + ChickenFit)

**Чат:** `CF · S3 · Lockup`  
**Вход:** ♥ mark из S2 (приложить файл)

```
SESSION 3 — LOCKUP only (attached mark is finalist candidate).

Compose mark + wordmark "ChickenFit" (one word, camel F optional: ChickenFit).
Type feel: heavy condensed contemporary grotesque / slab energy (Bricolage-like), tight tracking, not script, not comic, not Friz Quadrata, not KFC clone.
Gap mark↔type: tight but not touching; optical center.
Variants needed across 8 frames:
1 horizontal lockup dark on light
2 horizontal light on dark graphite
3 stacked (mark above type)
4 mark left, type right, compact social
5 type only (wordmark stress-test)
6 monochrome terracotta stamp
7 monochrome graphite
8 tiny favicon zone: mark alone + micro wordmark under

Backgrounds: #FDFCF9 and #28211D only.
No slogan, no tagline, no extra icons.
Label 1–8.
```

---

## SESSION 4 — Poster food art (сочная курица)

**Чат:** `CF · S4 · Poster Food`  
**Не путать с mark.**

```
SESSION 4 — POSTER FOOD ART only (not logo, not packaging layout).

Goal: appetite. Obvious juicy chicken product for brand poster.
Can include our UTP (pastry-wrapped chicken burger) OR hero chicken pieces with flaky side — but product must look delicious, fibrous, golden crust, steam/crumbs OK.
Language: illustrated food-art / JP appetite craft, drawn quality, NOT schematic blueprint, NOT grill hatch tabaka.
Background: near-white pastry #FDFCF9 or soft warm paper.
Composition: 2:1 or 4:5 poster crop — generate 8 strong hero frames.

Explore:
1 single hero UTP cross-section center
2 two pieces stacked, readable
3 hand-reaching / bite moment (no face)
4 crumbs + oil sheen emphasis
5 side profile flaky layers
6 top-down geometry still appetizing
7 darker moody still premium (not horror)
8 bright daylight cafe tray simple

Kill: logo, long text, mascot chicken, KFC bucket, cluttered collage.
Label 1–8.
```

---

## SESSION 5 — Banner 2×1

**Чат:** `CF · S5 · Banner`  
**Вход:** ♥ food S4 + ♥ lockup S3 если есть

```
SESSION 5 — BANNER 2×1 only.

Layout: wide 2:1, WHITE / near-white background (#FFFFFF or #FDFCF9).
Left or right: food hero (appetite). Opposite side: clear negative space for lockup OR soft placement of ChickenFit if attached.
Optional thin strip of 3–5 tiny mono food icons aligned baseline (sandwich/bowl/piece) — same size, not random.
No busy photo montage. No red KFC board. No night club lighting.

8 layout explorations (composition only changes):
1 food left, space right
2 food right, space left
3 centered food, type below band
4 full-bleed soft food, corner lockup
5 split panel 40/60
6 minimal: food small + bold type
7 icon strip bottom + food
8 poster crop adapted to 2:1 calm

Label 1–8. Keep production-clean for print/web header.
```

---

## SESSION 6 — Signage / facade

**Чат:** `CF · S6 · Signage`  
**Вход:** facade photo if available + ♥ lockup

```
SESSION 6 — SIGNAGE only (storefront application).

Apply ChickenFit lockup to airport-area fast-casual facade.
Need day + night readability. Materials: simple box sign / panel / window vinyl — not fantasy mega-LED.
Background building can be neutral modern; if photo attached, respect real proportions.

8 frames:
1 day — horizontal sign above entrance
2 day — window vinyl lockup
3 day — projecting blade sign
4 day — awning band
5 night — same as 1 lit warm
6 night — window glow
7 mono terracotta on light panel
8 graphite on pastry panel

Kill: clown colors, KFC roof, mascot statue, overcrowded menu boards.
Label 1–8. Prefer realistic install, not sci-fi.
```

---

## SESSION 7 — Packaging blanks

**Чат:** `CF · S7 · Packaging`  
**Правило craft:** простые бланки, 1–2 цвета штампа.

```
SESSION 7 — PACKAGING only (craft blanks + brand stamp).

Real-world Uzbekistan-available kraft/white carton language.
Stamp: terracotta #B94D2F mark (+ optional ChickenFit) 1-color.
No luxury foil fantasy, no full-bleed AI illustration wrap as only option.

8 frames:
1 kraft burger box lid stamp center
2 white box + corner mark
3 paper wrap band
4 sticker round 1-color
5 sticker square
6 napkin stamp
7 paper bag side
8 cup sleeve simple

Show flat dieline-ish OR realistic mock — but keep printable.
Label 1–8.
```

---

## SESSION 8 — Brandbook spreads

**Чат:** `CF · S8 · Brandbook`  
**Вход:** утвержденные mark, lockup, colors, 1 food hero

```
SESSION 8 — BRANDBOOK PAGES only (editorial layout).

Design 8 presentation spreads (16:9 or A4 landscape) for ChickenFit visual system.
Clean Swiss/craft editorial, not Notion defaults, not Canva junk gradients.
Pages to cover across the 8 frames (one theme each):
1 cover: mark + ChickenFit + "Brand system v1"
2 mark construction / clear space
3 color system (4 swatches + hex)
4 typography specimen
5 lockup do/don't
6 food photography / art direction
7 packaging applications
8 signage + banner applications

Use only approved assets attached. Russian or bilingual labels OK; keep short.
Label 1–8.
```

---

## После сессии (агенту / в репо)

| Сессия | Куда класть ♥ |
|--------|----------------|
| S1 | `design/assets/reference/gen/utp/hero/` |
| S2 | `design/assets/reference/gen/utp/marks/` |
| S3 | `design/assets/reference/gen/lockups/` |
| S4 | `design/assets/reference/gen/poster/` |
| S5 | `design/assets/reference/gen/banner/` |
| S6 | `design/assets/reference/gen/signage/` |
| S7 | `design/assets/reference/gen/packaging/` |
| S8 | `design/assets/reference/gen/brandbook/` |

Имя файла: `s1-hero-♥2.png` и т.п.

**Обязательно читай** `design/prompts/image-generation-standards.md` перед любой генерацией — там единый базовый промпт и правила единого стиля.

---

## Порядок (не нарушать)

```
S1 Hero → S2 Mark → S3 Lockup → S4 Poster → S5 Banner → S6 Signage → S7 Pack → S8 Book
```

Параллельно **не** открывать S4+S7+S8.  
Параллельно **можно** только: 8 кадров *внутри* одной сессии.