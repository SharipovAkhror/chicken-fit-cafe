---
title: "Дизайн-система бренда v1"
status: review
owner: visual-designer
created: 2026-07-24
updated: 2026-07-25
sources:
  - design/approved-art-direction.md
  - brand/BRANDBOOK.md
  - design/tokens.css
claims:
  - C-014
  - C-016
  - C-019
  - C-020
  - C-022
---

# Дизайн-система бренда v1 — ChickenFit

Рабочая система для утвержденного мира «Слой + Гостеприимство» (C-020) и
имени **ChickenFit** (C-022). Статус `review` — финальный `approved` ставит
владелец проекта после ревью логотипа и контраста.

## Имя и логотип

- Словесный знак: `ChickenFit` (без пробела, заглавные `C` и `F`).
- На светлом фоне: `Chicken` — графит, `Fit` — терракота.
- Смысл `Fit`: «подходит» ритму дня, **не** диетическое обещание.
- Фирменный модуль: три смещённых горизонтальных слоя слева или под знаком.
- Охранное поле: высота одной буквы `C`.
- Минимум: 28 мм (печать) / 112 px (экран) для wordmark; mark CF — 24 мм / 48 px.

### Файлы ассетов

| Файл | Назначение |
| --- | --- |
| `design/assets/logo-primary.svg` | Основной wordmark + слои |
| `design/assets/logo-horizontal.svg` | Фасад / вывеска |
| `design/assets/logo-mark.svg` | Квадрат CF (аватар, стикер) |
| `design/assets/logo-mono-terracotta.svg` | Один цвет — терракота |
| `design/assets/logo-mono-graphite.svg` | Один цвет — графит |
| `design/assets/favicon.svg` | Favicon |
| `design/assets/social-avatar.svg` | Social 512 |

PNG 1x/2x генерируются из SVG (скрипт или экспорт). Wordmark использует
семейство Unbounded; до лицензии и обводки в path допустим системный grotesque
fallback. Mark/favicon — чистая path-геометрия без шрифтов.

Запрещено: купола, самолёты, силуэты курицы, поварские колпаки, орнамент,
деформация, тени и новые цвета на логотипе.

## Токены цвета

```yaml
color:
  pastry: "#F3E7D3"      # фон 60%
  terracotta: "#B94D2F"  # бренд 10%
  graphite: "#28211D"    # текст 25%
  olive: "#667447"       # свежесть 5%
```

Digital-токены: [`design/tokens.css`](tokens.css).

### Контраст (ориентиры WCAG AA, текст)

| Пара | Оценка | Применение |
| --- | --- | --- |
| graphite / pastry | высокий | основной текст |
| pastry / graphite | высокий | инверсия (вывеска) |
| terracotta / pastry | border-line на мелком тексте | CTA-кнопка: pastry-текст **≥ 16 px / label 700** |
| olive / pastry | средний | только метки ≥ 14 px bold после проверки на реальном размере |
| terracotta / graphite | не для длинного текста | декоративные акценты |

Primary button: `terracotta` фон + `pastry` текст, radius 16, min height 44 px.
Secondary: transparent, graphite border/text. Не использовать olive как второй CTA.

## Типографическая шкала

| Роль | Семейство | Вес | Рекомендация |
| --- | --- | --- | --- |
| Display | Unbounded | 700 | 48/52 и выше |
| H1 | Unbounded | 700 | 36/42 |
| H2 | Unbounded | 600 | 28/34 |
| H3 | Unbounded | 600 | 20/26 |
| Body | Manrope | 400 | 16/24 |
| Label | Manrope | 700 | 14/20 |
| Caption | Manrope | 500 | 14/20 минимум |

Не использовать текст мельче 14 px в интерфейсах и меню. Перед печатью меню —
проверить полноту узбекской латиницы и кириллицы.

## Пространство и сетка

Базовый модуль — 8. Макеты: 8 / 16 / 24 / 32 / 48.
Mobile-first: 4 колонки; планшет: 8; desktop: 12. Главный продуктовый кадр —
не меньше половины первого экрана или ключевой полосы носителя.

## Радиусы

- Малый: 8 — теги.
- Средний: 16 — карточки и кнопки.
- Большой: 24 — продуктовые контейнеры.
- Упаковка следует реальной конструкции, не цифровым радиусам.

## Слоёный модуль

Три линии одинаковой толщины со сдвигом 12–18% длины. Минимум 24 мм (печать) /
48 px (digital). Поле вокруг — не меньше высоты одной линии. Не чаще одного
модуля на смысловую область.

## Фотография

Hero: разрез 30–45°, слои теста, курица, соус, тёплый свет.
Secondary: руки, выдача, сборка. Без левитации, фольклорного реквизита и
фотоколлажей.

## Компоненты digital

- Primary button: terracotta / pastry text / radius 16.
- Secondary button: transparent / graphite border + text.
- Product card: pastry surface, graphite text, one large image.
- Status tag: olive + pastry text после проверки контраста.
- Focus: 2 px graphite outline + 2 px offset.
- Карточка слоями: название → состав → цена → действие.

## Что ещё открыто

1. Товарное имя флагманского продукта (бургер-самса).
2. Обводка wordmark Unbounded → path после лицензии.
3. PNG 1x/2x batch-экспорт в CI/local.
4. Локализованные тексты меню (uz / ru / en).
5. Формат курицы по C-018.

## Критерии передачи в product

Дизайн-система становится входом для QR/UI только после `approved` владельцем
и закрытия критичных пунктов по логотипу.
