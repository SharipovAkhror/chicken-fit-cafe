---
title: "Master prompt — facade poster ChickenFit (one-shot image)"
status: draft
owner: system-architect
updated: 2026-07-25
sources:
  - design/research/r5-owner-brief.md
  - design/research/competitor-reference-board.md
  - design/tokens.css
  - STATUS.md
claims:
  - C-019
  - C-020
  - C-022
---

# Master prompt: плакат фасада 2×1

**Роль агента здесь:** архитектор промпта, не painter SVG.  
**Вкус:** только owner (ты) — генерируешь → смотришь → ♥ или один рефайн.  
**Модели:** Grok Imagine (web) · Gemini / Imagen · аналоги image gen.  
**Не для:** Claude Opus «как код-агент» (он не image-first).

## Как пользоваться (1 раз)

1. Открой **Grok Imagine** (grok.com) **или** Gemini image.  
2. Aspect / size: **2:1** (широкий баннер), если есть выбор.  
3. Скопируй блок **PROMPT** целиком (английский — так модели стабильнее).  
4. Если модель просит negative / avoid — вставь блок **AVOID**.  
5. Сгенерируй **1–4** варианта, **не** 40. Owner выбирает.  
6. Победитель сохрани в `design/assets/reference/gen/` (создашь папку).

**Честно:** одним кадром нельзя «весь брендбук + SVG лого + упаковка».  
Этим промптом закрываем **главную картинку фасада**: еда + бренд + strip.  
Лого как vector system — отдельный шаг после ♥ на плакат (или промпт B ниже).

---

## PROMPT (копировать целиком)

```
Create a premium outdoor cafe facade banner, wide 2:1 aspect ratio (like a 2 meter by 1 meter storefront sign panel), photoreal-quality food advertising illustration — NOT a childish cartoon logo sheet, NOT a wireframe, NOT flat icon design.

BRAND
- Brand name text must be clearly readable: "ChickenFit" as one word, capital C and capital F only (Chicken + Fit).
- Color the word "Chicken" in deep warm graphite/near-black (#28211D) and the word "Fit" in rich terracotta/orange-red (#C95530).
- Typography feel: bold modern geometric display sans, heavy weight, slightly tight letter-spacing, confident QSR quality (think premium fast-casual, NOT thin tech startup font, NOT script, NOT comic).
- Small secondary line under the name in quiet graphite: "КАФЕ · SAMARKAND" or "CAFE · SAMARKAND" in simple clean sans, letter-spaced.
- Optional small simplified food mark icon to the LEFT of the wordmark: simple chicken sandwich or chicken piece icon, flat, minimal, 1–2 colors only — this icon may be slightly simplified/cartoonish. The HERO food on the left of the banner must NOT look like that icon.

LAYOUT (strict zones, clean white storefront plastic panel look)
- Background of the entire banner: pure white / off-white paper white (#FFFFFF to #FDFCF9). NO black background. NO neon glow. NO dark gradient sky. NO AI black void.
- LEFT 45%: HERO fried chicken product (the star).
- RIGHT 50%: brand lockup (icon optional + ChickenFit wordmark + small cafe line), vertically centered, generous padding, optical balance.
- BOTTOM full-width thin strip: three short Russian appetite words with tiny simple icons (not the brand mark): "сочная" · "свежая" · "сытная" — or if Cyrillic is unreliable, use English "juicy · fresh · hearty". Icons: simple flame/leaf/bowl line icons, same size, one baseline, terracotta accent.

HERO CHICKEN (most important — must read as real appetizing chicken in under 0.3 seconds)
- Obviously fried / crispy chicken, NOT grilled tabaka, NOT barbecue hash marks, NOT shawarma cone, NOT whole raw bird, NOT a cartoon rooster with eyes, face, muscles, or gym props.
- Show 2–3 pieces in a delicious stack: one large thigh or breast piece as hero, one drumstick with visible bone knuckle, optionally a smaller piece for portion.
- Crispy golden-brown to deep terracotta crust, irregular bumpy breading, visible crunch texture and fine crumb flecks.
- Where meat is exposed or on a cut face: light cooked chicken meat color with clear muscle fibers (this must look like chicken meat, not abstract orange blobs).
- Juicy highlights, subtle sauce sheen, tiny drips of savory glaze — appetite, warmth, "I want to eat this".
- Soft steam wisps above (fresh/hot), quiet green herb garnish (parsley/cilantro), NO vegetable rainbow clutter.
- Lighting: warm appetizing key light as if under cafe warm lamps, soft natural shadow on the white panel, shallow sense of depth but still print-ready commercial food art (premium QSR billboard / Japanese convenience packaging quality hybrid — clean, not greasy stock photo chaos).
- Style: high-end commercial food illustration OR refined product render that still feels illustrated-premium — slightly more stylish than pure photo, but MUST remain clearly edible chicken. Think "Popeyes / premium chicken board appetite" craft, not 3D yellow cartoon chicken.

COLOR SYSTEM (only)
- White / near-white ground
- Terracotta #C95530 and deeper roasted browns for chicken
- Graphite #28211D for text
- Soft pastry cream only as tiny crumbs/highlights
- One quiet olive green only for tiny herbs — never as logo color block

COMPOSITION QUALITY
- Professional art direction, balanced negative space, no clutter, no watermarks, no stock-photo logos of other brands.
- Readable from a distance: left = FOOD (chicken), right = NAME (ChickenFit).
- Clean edges suitable for print on a white plastic facade panel above doors.
- Square-safe margins; do not crop text.
- No fake "EST. 2024" badges, no flames background, no city skyline, no people, no cars, no interior photo collage.

MOOD
- Warm hospitality fast-casual in Samarkand, honest product, modern, appetizing, trustworthy. Slight Japanese packaging restraint (clean, few elements) + American chicken QSR hunger cue (crispy, juicy, portion). Not luxury fine dining. Not fitness diet brand. "Fit" means fits your day / satisfying, NOT low-calorie gym.

OUTPUT
- Single wide banner image, 2:1, sharp, high detail on the chicken crust and meat fibers, crisp typography.
```

---

## AVOID / negative (если поле есть — вставить)

```
black background, neon glow, yellow 3D cartoon chicken, rooster with face or eyes, gym, dumbbells, colonel sanders, KFC logo, bucket logo, brand watermarks, grill tabaka hash marks, raw chicken, whole live bird, blood, horror, cluttered collage, 5 fonts, rainbow vegetables, sakura, mosque domes, airplanes, purple neon, cyberpunk, blurry text, misspelled ChickenFit, "Chicken Fit" with space if avoidable, comic sans, script calligraphy logo, drop-shadow chrome letters, stock photo cafe interior filling the whole frame, AI plastic skin people, extra fingers, watermark, logo of other brands, dark moody black void, lens flare overload
```

---

## Если модель плохо пишет текст "ChickenFit"

В том же чате **одним** follow-up (не новый мир):

```
Keep the exact same composition, chicken, colors, and white background. Only fix the brand typography: redraw clean bold sans-serif "ChickenFit" with Chicken in #28211D and Fit in #C95530, perfectly spelled, sharp edges, no distortion.
```

---

## Промпт B (опционально, второй paste) — только лого-лист

Нужен **после** ♥ на плакат, если хочешь отдельный лист знака.  
Не мешать с плакатом в одном кадре.

```
Design a clean brand logo presentation sheet on near-white background (#FDFCF9) for "ChickenFit" fast-casual chicken cafe.

Left: simple memorable food mark icon (chicken sandwich OR crispy chicken piece OR takeaway box with chicken) — flat vector logo style, 1–2 colors only (terracotta #C95530 and graphite #28211D), readable at small size, no rooster head with eyes, no samsa, no three horizontal stripes as the logo, no letter seal monogram as primary.

Right: wordmark "ChickenFit" bold modern geometric sans (Bricolage Grotesque / similar), Chicken in graphite, Fit in terracotta, tight optical spacing.

Below: same lockup smaller in one-color graphite mono version.

Style: professional brand guidelines mock, lots of white space, not a menu poster, not photoreal chicken, not busy illustration. Japanese-modern restraint + clear QSR readability.
```

---

## Чеклист owner (вкус — только ты)

После генерации, за 30 секунд:

- [ ] С 1 взгляда слева: **курица, хочу есть**  
- [ ] Справа: **ChickenFit** читается, цвета dual  
- [ ] Фон **белый**, не чёрный glow  
- [ ] Нет петуха-качка / KFC clone / grill tabaka  
- [ ] Не « fortschematic SVG blob »  

♥ → сохранить.  
× → **не** переписывать весь бренд; 1 follow-up выше или 1 реген с той же PROMPT.

---

## Куда вставлять

| Сервис | Заметки |
| --- | --- |
| **Grok Imagine** | web; aspect 16:9 или closest to 2:1; paste PROMPT |
| **Gemini Pro** image | paste PROMPT; попросить 2:1 banner |
| Google Imagen (если в AI Studio) | same; negative = AVOID |

Агент в репо после твоего ♥: кладёт файл, обновляет STATUS, **не** открывает R6 SVG-войну.
