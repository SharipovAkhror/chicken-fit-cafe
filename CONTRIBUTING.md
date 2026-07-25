# Как вносить изменения

## До начала работы

1. Найдите или создайте issue по подходящему шаблону.
2. Назначьте владельца и необходимые роли ревью.
3. Укажите входные документы и проверьте их статусы.
4. Если вход не approved — сначала решите блокирующую задачу.

## Ветки

Формат: `type/issue-id-short-description`.

Допустимые `type`: `feat`, `fix`, `docs`, `research`, `decision`, `chore`.
Пример: `research/42-verify-airport-demand`.

Репозиторий: https://github.com/SharipovAkhror/chicken-fit-cafe  

После включения branch protection на `main`: прямые push запрещены, обязателен
PR, успешный CI и минимум одно релевантное cross-review. До включения защиты
владелец может принимать bootstrap-коммиты напрямую.

## Коммиты

Используйте Conventional Commits:

```
docs(strategy): add verified audience brief
research(operations): document service-time test
fix(knowledge): correct claim source
```

## Pull request

- Заполните все поля шаблона.
- Свяжите PR с issue (`Closes #...`).
- Перечислите источники и изменённые claims.
- Для критичного решения добавьте/обновите ADR.
- Запустите `node tools/validate.mjs`.
- Запросите владельца области и затронутые роли.

## Критерии готовности

- критерии issue выполнены и проверяемы;
- документ имеет корректный статус и метаданные;
- новые утверждения внесены в `knowledge/claims.yaml`;
- нет неподтверждённых данных, выданных за факты;
- handoff заполнен при межролевой передаче;
- CI зелёный; риски и открытые вопросы указаны;
- критичные решения утверждены человеком.
