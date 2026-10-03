---
id: ADR-003
title: Публикация remote и agent harness
status: accepted
owner: system-architect
created: 2026-07-25
updated: 2026-07-25
sources:
  - knowledge/facts/project-setup.md
  - knowledge/claims.yaml#C-021
claims:
  - C-010
  - C-021
---

# ADR-003: Публикация remote и agent harness

## Контекст

Этап 0 ограничивал работу локальными файлами без удалённого репозитория. Владелец
создал GitHub-репозиторий и поручил вести проект там, переименовать локальную папку
и настроить harness для AI-агентов.

## Решение

1. Канонический remote: `https://github.com/SharipovAkhror/chicken-fit-cafe`.
2. Локальная папка клона: `chicken-fit-cafe` (вместо временного `1213`).
3. Owner в CODEOWNERS: `@SharipovAkhror`.
4. Agent harness v1:
   - канон правил — `AGENTS.md`;
   - vendor-стабы (`CLAUDE.md`, `GEMINI.md`, `GROK.md`, `.github/copilot-instructions.md`)
     только редиректят на `AGENTS.md`;
   - handoff-статус — `STATUS.md`;
   - CI — `node tools/validate.mjs` на push/PR.
5. Интерфейс ОС v1 по-прежнему файлы + GitHub (без веб-панели агентов).

## Последствия

- История и PR становятся видимыми на GitHub.
- Агенты разных вендоров получают единый onboarding.
- Граница «remote не создаётся» из этапа 0 снята этим ADR.
- Защита ветки `main` и labels настраиваются после первого push.

## Проверка

- Remote доступен, default branch `main`.
- `node tools/validate.mjs` проходит локально и в CI.
- CODEOWNERS указывает на реального пользователя.
