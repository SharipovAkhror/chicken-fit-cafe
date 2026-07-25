# Инструменты проверки

## Запуск

```bash
node tools/validate.mjs
```

Скрипт не требует сторонних пакетов и проверяет:

- наличие обязательной структуры ОС;
- front matter рабочих Markdown-документов;
- обязательные поля approved-документов;
- внутренние Markdown-ссылки;
- синтаксис JSON;
- уникальность и допустимые статусы claims;
- источник, владельца и метод проверки каждого claim;
- `verified_by`/`verified_at` у confirmed claims;
- наличие происхождения архива Gemini.

`.github/workflows/validate.yml` запускает тот же скрипт в pull request и основной
ветке. Дополнительно CI блокирует изменение файлов `archive/gemini/`.
