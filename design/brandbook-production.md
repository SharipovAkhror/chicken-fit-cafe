---
title: "Формат и производство брендбука"
status: draft
owner: visual-designer
updated: 2026-07-25
sources:
  - https://toimi.pro/blog/how-to-create-brand-book-guide-templates/
  - https://www.canva.com/learn/your-brand-needs-a-visual-style-guide/
  - https://www.canva.com/help/brand-kit/
  - design/craft-standards.md
claims:
  - C-022
---

# Формат и производство брендбука

## Короткий ответ

| Формат | Роль |
| --- | --- |
| **PDF 20–30 стр.** (горизонт. 1920×1080 или A4 landscape) | Каноническая выдача: презентация инвестору/партнёру/типографии |
| **Canva Brand Kit + набор шаблонов** | Живая работа: посты, меню-правки, стикеры, баннеры |
| **Repo `design/` + SVG** | Source of truth для разработки и агентов |

Не «или PDF или слайды» — **оба**: Canva = мастер для правок, PDF = экспорт
версии v1.0 / v1.1.

Профессиональный ориентир: 7 блоков, без 80-страничного «памятника».

## Структура ChickenFit Brand Book v1

1. **Обзор** — кто мы, C-019, характер (1–2 разворота)
2. **Mark + logo system** — primary, mono, clear space, don’ts
3. **Цвет** — 4 токена, 60/25/10/5, contrast notes
4. **Типографика** — display + body, шкала (шрифт TBD после mark)
5. **Иконка и photo** — mark usage; свет тёплый «лофт», продукт-герой
6. **Носители** — упаковка-бланки + stamp; стикеры; постеры; баннер; соц.
7. **Voice** — коротко (из brand/tone-of-voice)
8. **Приложения** — файлы, лицензии шрифтов

## Canva Pro — как интегрируем

### Что реально

- **Brand Kit** в Canva Pro: цвета HEX, логотипы, шрифты — ты заводишь у себя.
- Мы готовим **пакет для Brand Kit**:
  - `brand-kit/colors.txt` (HEX + роли)
  - финальные SVG/PNG лого
  - список шрифтов + ссылки
  - шаблонные тексты do/don’t
- **Шаблоны** в Canva: Stories, post 1:1, меню A4, постер A2, наклейка — по
  макетам из repo (я задаю сетку и копирую правила; ты дублируешь в Canva
  или даёшь доступ к команде).

### Чего нет «из коробки» в этом репо

- Прямой OAuth в твой Canva Pro **без** Connect app / токенов.
- Полный API autofill brand templates — в документации Canva часто
  завязан на **Enterprise**, не на личный Pro.
- Мы **не** храним пароль Canva в git.

### Практичный workflow v1

```
Repo (токены, SVG, правила)
    → ты: Brand Kit в Canva Pro
    → макеты брендбука / постеров в Canva (или HTML→PDF у нас)
    → Export PDF → tools/brandbook-pdf/ или brand/exports/
    → human approve
```

Если дашь **редакторский доступ** (team invite) на папку Canva — могу
описывать точные размеры, слои и копирайт постранично под твою сборку.
Автоматически «пушить» файлы в Canva без API key — нельзя.

## PDF pipeline в репо

Уже есть задел: `tools/brandbook-pdf/`.  
После утверждения mark:

1. HTML-развороты (типографика бренда, без AI-фонов).
2. `render.mjs` / Playwright → PDF.
3. Параллельно — Canva-экспорт как marketing-friendly копия.

## Носители после mark (очередь)

| Носитель | Формат | Приоритет |
| --- | --- | --- |
| Social avatar | 512 / 1024, mark only | P0 |
| Стикер круг | 40–50 mm, 1+0 | P0 |
| Постер «обед» | A2 / 1080×1350 | P1 |
| Баннер фасад | ratio 4:1 / 3:1 | P1 |
| Story / post | 9:16 / 1:1 Canva | P1 |
| Меню board | A3 | P2 |
| Упаковка stamp | на бланке P1–P4 | P2 после blanks approve |

## Definition of Done брендбука v1

- [ ] Утверждён mark (M1–M4 или hybrid)
- [ ] Утверждён wordmark + font
- [ ] Цвета и type в Brand Kit Canva
- [ ] PDF 20–30 стр. с do/don’t
- [ ] Пакет SVG/PNG
- [ ] 3+ шаблона носителей (стикер, post, постер)
- [ ] Упаковка: утверждённые бланки + правило штампа (без фейк-3D)
