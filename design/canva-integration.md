---
title: "Canva: что реально с Pro и API"
status: draft
owner: visual-designer
updated: 2026-07-25
sources:
  - https://www.canva.dev/docs/connect/authentication/
  - https://www.canva.com/help/canva-api/
  - https://www.canva.com/help/brand-kit/
  - SECURITY.md
  - design/system-map.md
---

# Canva Pro и «API-ключ»

## Прямой ответ

**Просто скинуть «API key» и чтобы я сам зашёл в твой Canva как в аккаунт —
так не работает.**

Canva Connect API использует **OAuth 2.0** (client id + client secret + твой
логин-consent в браузере), а не пароль и не один вечный ключ «войти и
редактировать все дизайны».

| Способ | Работает? | Комментарий |
| --- | --- | --- |
| Пароль / «зайди в мой Canva» | **Нет** | Небезопасно, не поддерживаем, не в git |
| Один API key «как OpenAI» | **Нет** (не модель Canva) | Нужен OAuth app |
| Connect API: Client ID + Secret + OAuth | **Частично** | Нужен Developer Portal, redirect URL, scopes; многие brand-template autofill — **Enterprise** |
| Invite в team / shared folder Canva Pro | **Да, проще всего** | Ты шаришь папку; я даю макеты/спеки; правки — в UI |
| Brand Kit вручную из наших файлов | **Да, baseline** | `design/brand-kit/` → ты заливаешь цвета/лого |
| HTML/PDF брендбук в repo | **Да** | Не зависит от Canva API |

## Если всё же хочешь Connect API

1. Canva → Developers → создать **integration** (Connect API).
2. Получить **Client ID** и **Client secret**.
3. Настроить redirect URL (локальный callback или сервис).
4. Пройти OAuth (ты жмёшь «Allow» в браузере).
5. Секреты — **только** в env / secret manager, **никогда** в репозиторий
   (`SECURITY.md`).

Даже после этого я **не** «сижу в Canva как дизайнер-человек» в полном UI.
API даёт операции: ассеты, дизайны, иногда autofill шаблонов — в рамках
плана и scopes. Редактирование «как руками в редакторе» API не заменяет.

## Рекомендация для ChickenFit сейчас

1. **Не** тратить время на API, пока нет утверждённого mark.
2. После mark: пакет `design/brand-kit/` (цвета + SVG + шрифты).
3. Ты создаёшь Brand Kit в Pro (5 минут).
4. Опционально: shared folder «ChickenFit Brand» + invite.
5. API — только если позже понадобится автоматизация (много шаблонов, n8n).

## Чего не присылай в чат/git

- пароль Canva
- client secret (если уже создал — rotate, не коммить)
- recovery codes

Если создашь integration — client id можно обсуждать; secret передавать
только через безопасный канал и локальный `.env` (в `.gitignore`).
