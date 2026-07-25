---
title: "Кандидаты шрифтов (исследование)"
status: draft
owner: visual-designer
updated: 2026-07-25
sources:
  - https://fonts.google.com
  - https://typescale.com/
  - https://www.modularscale.com/
  - https://leadpages.com/blog/best-google-fonts
  - design/research/case-board.md
claims:
  - C-009
  - C-022
---

# Type candidates

Требования: **кириллица** + латиница; вывеска; меню 14px+; не «диетический fit».

Unbounded (старый кандидат) — ок как display, но проверить полноту UZ и
не выглядит ли «crypto/startup 2022».

## Пары для теста (Google Fonts, free)

| ID | Display / Wordmark | Body | Характер | Риск |
| --- | --- | --- | --- | --- |
| T1 | **Unbounded** 600–700 | **Manrope** 400–700 | Геометрия + human | Слишком «tech» |
| T2 | **Syne** 700 | **Manrope** | Современный, чуть странный | Syne less neutral |
| T3 | **Outfit** 700 | **Source Sans 3** | Чистый urban fast-casual | Может быть generic |
| T4 | **Bricolage Grotesque** 700 | **Manrope** | Craft, характер | Нужна проверка кириллицы |
| T5 | **Literata** 600 (soft serif) | **Manrope** | Теплее, «пекарня×кафе» | Менее «fast» |
| T6 | **Geist** / **Inter** tight | **Inter** | JP-adjacent neutral | Слишком UI |
| T7 | **Onest** 700 | **Onest** 400 | Единая семья, RU-friendly | Мало контраста display/body |
| T8 | **Unbounded** | **IBM Plex Sans** | Строже, системнее | Холоднее hospitality |

## Wordmark tests (слово ChickenFit)

Проверять:

1. `ChickenFit` one word — tracking  
2. `Chicken` + `Fit` dual color  
3. Только `CF`  
4. Вертикаль для узкой вывески (если нужно)

## Scale (рабочий, 8-pt)

| Role | Size / line | Notes |
| --- | --- | --- |
| Display | 48 / 52 | wordmark zone |
| H1 | 36 / 42 | |
| H2 | 28 / 34 | |
| H3 | 20 / 26 | |
| Body | 16 / 24 | min UI |
| Label | 14 / 20 | never below 14 |

Ratio candidate: **1.25** major third from 16.

## Specimen

Открыть `design/assets/micro/gallery-r5.html` → секция Wordmarks (T4 + K1).

## Cull

Отметить 2 пары max для следующего круга.
