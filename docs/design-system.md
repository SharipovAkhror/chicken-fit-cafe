# Дизайн-система кассы (v2.3)

Всё в одном файле: [`features/ui/v2.css`](../features/ui/v2.css), область `.v2` (подключается в `app/pos`, `app/kds`, `app/backup`).
Тёмная тема — `.v2[data-theme='dark']`. Гостевое меню использует отдельные бренд-токены `features/ui/brand-tokens.css` (Tailwind).

## Токены
- Цвета: `--bg --surface --surface-2 --text --muted --border --border-strong`, бренд `--brand` (нетекстовые элементы),
  `--primary`/`--on-primary` (главная кнопка), `--primary-ink` (текст бренд-цвета), `--accent --success --warning --danger --info`.
- Форма: `--r-sm 8px`, `--r 12px`, `--r-lg 16px`; тени `--shadow-1/-2/-pop` (вместо рамок).
- Состояния: `--hover` (4% текста), `--press` (8%); фокус — кольцо бренда.
- Движение: `--ease-out cubic-bezier(.2,.8,.2,1)`, `--t-fast 120ms`, `--t 180ms`, `--t-slow 240ms`.
- Шрифт Inter (`app/fonts`), `tabular-nums` для сумм.

## Компоненты (классы)
`btn` (`btn-primary`, `btn-ghost`, `btn-icon`, `btn-lg`, `btn-danger`), `input`, `seg` (`seg-fill`, `seg-lg`; выбор — `aria-checked/selected/pressed`),
`cat-chip` (`aria-selected` во вкладках, `aria-pressed` в фильтрах), `pcard` (+ `pcard-media`, `pcard-qty`, `pcard-new`),
`tcard` (`is-free`/`is-busy`, `data-tone`, `tcard-status`, `dot`), `line`/`line-main` (строки чека), `dialog`/`scrim` (через `Modal` в `features/pos/common.tsx`),
`numkey`, `pad-field`, `edit-pane`, `menu-pop`, `banner-*`, `app-bar`, `app-rail`.

## Правила
- Иконки только `lucide-react`, stroke 1.75 (задано глобально), размеры 14/18/20/22. Без эмодзи и текстовых значков.
- Один акцент на экран: бренд-цвет — у главного действия; состояния — точкой/тонкой полосой, без заливок.
- Состояния стола: brand «Открыт», info «На кухне/Готовится», success «Готов/Оплачен», accent «Счёт выдан»; таймер `warning` с 45 мин.
- Движение: появление строки чека (opacity + 6px, 180 мс), схлопывание удалённой (180 мс), диалог pop 180 / закрытие 140 мс,
  на ≤600px — нижний лист 240 мс, нажатие `scale(.97–.98)`. `prefers-reduced-motion` → 1 мс, без transform.
- Touch-цели ≥ 44px (основные кнопки 48–60px). Контраст текста ≥ 4.5:1, нетекстовых элементов ≥ 3:1 (обе темы; расчёт — в комментарии `v2.css`).
