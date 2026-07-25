# Chicken Fit Cafe — ОС проекта

Единый источник истины для запуска кафе **Chicken Fit Cafe** и совместной работы
AI-ролей и человека.

**Репозиторий:** https://github.com/SharipovAkhror/chicken-fit-cafe

Репозиторий работает как операционная система проекта: правила, база знаний,
контракты ролей и процесс принятия решений живут в файлах и в GitHub-процессе.

> Основной язык — русский. Технические термины допустимы на английском.

## Главный принцип

**Предположение не является фактом, пока оно не подтверждено явно.**
Ранее сгенерированные материалы (папка [`archive/gemini/`](archive/gemini/))
сохранены как история и не наследуются как решения. Любое утверждение из них
проходит через реестр [`knowledge/claims.yaml`](knowledge/claims.yaml).

## С чего начать

| Кто | Куда |
| :--- | :--- |
| Человек / новый агент | [`STATUS.md`](STATUS.md) → [`AGENTS.md`](AGENTS.md) |
| Карта потоков | [`strategy/project-map.md`](strategy/project-map.md) |
| Факты | [`knowledge/`](knowledge/) |
| Роль | [`agents/`](agents/) |
| Задача | [`backlog/`](backlog/) + [`CONTRIBUTING.md`](CONTRIBUTING.md) |

## Agent harness

| Файл | Назначение |
| :--- | :--- |
| `AGENTS.md` | Канон правил для всех AI |
| `STATUS.md` | Текущий handoff / OPEN |
| `CLAUDE.md` / `GEMINI.md` / `GROK.md` | Vendor-стабы → `AGENTS.md` |
| `.github/copilot-instructions.md` | Copilot-стаб → `AGENTS.md` |
| `node tools/validate.mjs` | Локальная + CI-проверка структуры |

## Структура репозитория

| Область | Назначение |
| :--- | :--- |
| [`knowledge/`](knowledge/) | База знаний: реестр утверждений, подтверждённые факты, глоссарий |
| [`strategy/`](strategy/) | Карта проекта, дорожная карта, бизнес-стратегия |
| [`brand/`](brand/) | Бренд-платформа и вербальная идентичность |
| [`design/`](design/) | Визуальная система и дизайн-артефакты |
| [`operations/`](operations/) | Операционная модель, SOP, сервис |
| [`finance/`](finance/) | Финансовая модель и допущения |
| [`product/`](product/) | QR-продукт и цифровые сервисы |
| [`agents/`](agents/) | Контракты шести AI-ролей |
| [`decisions/`](decisions/) | Журнал решений (ADR) |
| [`templates/`](templates/) | Шаблоны артефактов |
| [`backlog/`](backlog/) | Стартовые задачи следующих этапов |
| [`tools/`](tools/) | Локальные валидаторы (те же, что в CI) |
| [`archive/`](archive/) | Неизменяемые исходные материалы |

## Локальные проверки

```bash
node tools/validate.mjs
```

Тот же скрипт запускается в CI (`.github/workflows/validate.yml`).

## Границы текущего этапа

- Remote GitHub — **активен** (`SharipovAkhror/chicken-fit-cafe`).
- Клиентское QR-приложение пока не разрабатывается.
- Финальное название/логотип бренда — только через ADR + human approval.
- Без БД, SaaS-интеграций и веб-панели агентов: интерфейс v1 — файлы и GitHub.
