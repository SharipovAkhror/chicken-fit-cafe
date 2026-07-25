---
title: "Canva: могу ли я его использовать и как подключить"
status: draft
owner: visual-designer
updated: 2026-07-25
sources:
  - https://www.canva.dev/docs/connect/
  - https://www.canva.dev/docs/connect/authentication/
  - https://www.canva.dev/docs/connect/quickstart/
  - https://www.canva.com/help/brand-kit/
  - https://www.canva.com/help/brand-kit-builder/
  - SECURITY.md
claims:
  - C-022
---

# Canva: правда без маркетинга

## Одним абзацем

Я **не** сижу в твоём Canva как человек в браузере. У меня нет окна
редактора Canva «от твоего логина».  
Зато есть **три рабочих способа** разной силы: (1) я делаю брендбук и
ассеты здесь → ты кладёшь в Brand Kit; (2) ты даёшь shared-папку / team;
(3) опционально — Connect API (OAuth), чтобы заливать файлы и создавать
заготовки дизайнов.  
**«Просто API-ключ и работай сам в Canva» — так Canva не устроен.**

---

## Что я могу / не могу

| | |
| --- | --- |
| ❌ Зайти по паролю и двигать слои в редакторе | Нет |
| ❌ Один API key = полный доступ как у дизайнера в UI | Нет |
| ✅ Сделать брендбук, лого, токены, PDF/HTML **в репо** | Да, сейчас |
| ✅ Подготовить пакет для Canva Brand Kit (цвета, SVG, шрифты, правила) | Да |
| ✅ Описать постранично макет, который ты (или я по API) создаёшь в Canva | Да |
| ✅ Connect API: upload assets, create design, export (после OAuth) | Да, если настроим |
| ⚠️ Brand Template Autofill | Часто **Enterprise**, не личный Pro |
| ✅ Использовать открытые референсы (японский F&B и т.д.) вне Canva | Да |

Официально Connect API: upload assets → create designs for user to edit →
export back. Это **интеграция**, не замена дизайнера в UI.

---

## Что полезно достать из Canva Pro (для нас)

| Фича Pro | Польза для ChickenFit |
| --- | --- |
| **Brand Kit** | Цвета, лого, шрифты, voice — единая полка |
| **Brand Kit from PDF** | Залил наш PDF брендбука → Canva вытащит цвета/элементы |
| **Templates** | Постер, stories, меню, стикер — на наших правилах |
| **Premium fonts / mockups** | Крафт-мок, фасад, соц. (осторожно с «едовым» клише) |
| **Export PDF/PNG** | Раздача брендбука и носителей |
| **Magic / AI inside Canva** | Только mood; финал — craft, не slop |
| **Team share** | Ты approve, я готовлю файлы в shared folder |

Canva **не** заменяет: стратегию, уникальный mark, типографический характер.
Он — **сборочный цех и библиотека**, не мозг бренда.

---

## Три способа подключения (от простого к сложному)

### Способ 1 — Baseline (рекомендую начать с него) ✅

```
Я в git: лого / цвета / брендбук PDF или HTML
    → ты: Brand Kit → upload
    → ты: «Create design» из Brand Kit
    → export PDF ↔ repo
```

**Твои действия:** ничего технического, только решения (какой mark/направление).  
**Мои:** весь craft + файл «залей вот это в Brand Kit».

Можно ускорить: Canva **Brand Kit Builder** — upload brand guidelines PDF.

### Способ 2 — Shared folder / Team invite ✅✅

1. В Canva создай папку `ChickenFit Brand`.
2. Invite на email, которым удобно (viewer/editor).
3. Скажи в чате: «папка расшарена».

Я **по-прежнему** не «живу» в UI, но workflow ясный:

- я кладу в repo готовые SVG/PDF/спеки страниц;
- ты (или ассистент с доступом) кидаешь в папку;
- правки по комментариям — ты жмёшь approve.

Это не API, но для брендбука **достаточно и быстрее**, чем OAuth.

### Способ 3 — Canva Connect API (если очень нужно «самому через API»)

Не «ключ в чат». Цепочка:

1. Зайди: [Canva Developers — Connect](https://www.canva.dev/docs/connect/)
2. **Create integration** (private для себя / team).
3. Получи **Client ID** + **Client secret**.
4. Scopes (минимум): `asset:read` `asset:write` `design:meta:read` `design:content:read` `design:content:write` `profile:read` (+ folder если есть).
5. Redirect URL (для локали часто `http://127.0.0.1:3001/oauth/redirect` — как в starter kit).
6. Ты один раз жмёшь **Allow** в браузере (OAuth).
7. Появляются access/refresh tokens → только в **локальный `.env`**, gitignore.

Starter kit: https://github.com/canva-sdks/canva-connect-api-starter-kit  

После этого я *теоретически* могу:

- залить лого/иконки как assets;
- создать пустой/шаблонный design;
- запросить export.

Я **не** смогу полноценно «собрать арт-дирекцию слоями как в Figma/Canva UI»
только через API — сложный layout всё равно в редакторе или в нашем PDF.

**Private integration** в полной мере часто завязан на **Enterprise** team.  
Public integration — review Canva. Для одного бренда Способ 1–2 почти всегда лучше.

---

## Чего не присылать

- пароль Canva  
- client secret в issue/PR/git  
- recovery codes  

Client ID — можно. Secret — только secure channel + `.env`.

---

## Решение для ChickenFit (предложение дизайнера)

| Этап | Инструмент |
| --- | --- |
| 1. Позиционирование + необычный референс (JP F&B / craft, не копия) | Research + docs в repo |
| 2. Mark, type, color lock | Repo craft (SVG, type tests) — **не** Canva AI icons |
| 3. Brand book 20–30 стр. | HTML→PDF **или** макет-спека под Canva |
| 4. Brand Kit | Ты upload PDF/ассеты (Способ 1) |
| 5. Носители на крафте | Canva mockups **после** лого |
| 6. API | Только если устанем от ручного upload |

**Сейчас подключать API не обязательно.** Подключать имеет смысл, когда
ассеты уже есть и хочется автозаливки.  
Сначала — бренд-ядро; Canva — полка и производство макетов.

---

## Что спросить у владельца (только решения)

1. Идём **Способ 1** (я делаю, ты Brand Kit) или сразу **Способ 2** (shared folder)?
2. API (Способ 3) — **не сейчас** / **настроить позже**?
3. Брендбук v1: больше **PDF-презентация** или **Canva multi-page** (или оба)?
