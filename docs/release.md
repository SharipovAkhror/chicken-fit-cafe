# Релиз и откат

## Окружения
| | Откуда | База |
|---|---|---|
| Прод | push в `main` → Vercel Git integration → https://chicken-fit-cafe.vercel.app | прод Supabase (env Production) |
| Preview | любая другая ветка/PR → URL `*-akhrors-projects-fc8c3afa.vercel.app` (за Vercel Authentication) | нет env → «Только локально» (#13) |
| Локально | `npm run dev` | что в `.env.local` (осторожно: прод) |

Переменные — [`setup.md`](setup.md#переменные-окружения-и-секреты). Список деплоев: Vercel → проект `chicken-fit-cafe` → Deployments,
`vercel ls chicken-fit-cafe --prod --scope akhrors-projects-fc8c3afa` или
`gh api "repos/SharipovAkhror/chicken-fit-cafe/deployments?environment=Production" --jq '.[]|[.sha[0:7],.created_at]|@tsv'`.

## Релиз
1. Ветка от `main` → push → PR (шаблон с `Closes #N`) → CI зелёный: `check`, `migrations`, `e2e`.
2. Новые миграции — в Supabase **до** мержа ([`migrations.md`](migrations.md#применение-в-прод-supabase-ikvontqurgzopdmsdmla)).
3. Согласие владельца → merge PR или `git checkout main && git merge --ff-only <ветка> && git push origin main`.
4. Vercel собирает прод (~1 мин); дождаться `READY` (дашборд или `vercel ls … --prod`).
5. Проверка:
   ```bash
   for p in api/keepalive pos kds backup ""; do curl -s -o /dev/null -w "%{http_code} /$p\n" https://chicken-fit-cafe.vercel.app/$p; done  # все 200
   curl -s https://chicken-fit-cafe.vercel.app/api/keepalive          # {"status":"ok",…}
   BASE=https://chicken-fit-cafe.vercel.app SHARE=https://chicken-fit-cafe.vercel.app/ ADMIN_PIN=… node tests/e2e/real-supabase-readonly.mjs
   ```
   Записать id нового прод-деплоя в журнал ниже.
6. На кассе перезагрузить вкладку (сервис-воркера нет; старая вкладка работает на старом коде до перезагрузки).

## Откат
- **Код:** Vercel → Deployments → нужный прод-деплой → ⋯ → **Instant Rollback** (без пересборки), или
  `vercel rollback <dpl_id или URL> --scope akhrors-projects-fc8c3afa`. После отката Vercel перестаёт автоматически
  выводить новые пуши в `main` на прод-домен — вернуть: «Undo Rollback» в дашборде или `vercel promote <dpl_id> --scope …`.
- **Текущая цель отката:** при проблемах с v3 — `dpl_AZKD6asHkNdKfPLC86XczNPEqxyk` (`49161e0`, код = `ceac3c6`, v2.3 + fix оплаты/печати;
  равноценен `dpl_H2dsGiR13Mym5giz8xh1owHFz5bi`). Старый код совместим со схемой 0011–0014 — миграции при откате не трогать.
  Глубже — `dpl_BrqYthiJSCDCiYwdgECR7sdL9JJZ` (v2.0, `74ab3bb`). Если плох только последний деплой — предыдущая строка журнала.
  Деплои только с документацией равноценны по коду. Без доступа к Vercel (CLI/дашборд) откат кода — `git revert -m 1 <merge> && git push origin main`.
- **БД:** миграции аддитивные — откат кода их не требует; данные новой версии остаются и читаются старой.
- **Данные устройства:** IndexedDB `cf2` и ключи v1 в localStorage не удаляются; `/backup` даёт JSON-копию.

## Журнал прод-деплоев
| Дата (UTC+5) | Коммит | Деплой | Что |
|---|---|---|---|
| 03.10.2026 | `74ab3bb` | `dpl_BrqYthiJSCDCiYwdgECR7sdL9JJZ` | v2.0 (переход с v1; v1 — `dpl_DtNZzsEdt2aSZUtMJ9pT7aH8Vayj`, тег `pre-v2`) |
| 04.10.2026 01:16 | `b225f30` (ux/v2.1 → main, ff) | `dpl_s8M5f2VMgYi1PgQLdXyWhkj1raYb` | v2.1–v2.3: типы товаров, правка позиций, аудит цены (0010 применена до деплоя), редизайн, чистка репо. Откат → `dpl_BrqYthiJSCDCiYwdgECR7sdL9JJZ` |
| 04.10.2026 01:20 | `c22918b` | `dpl_13dfRaq2kwoCaT3SvWwUt8uUV87h` | только docs/тесты |
| 04.10.2026 01:26 | `48ab237` | `dpl_5YgQTqbiKenXDrKoJ86e32izJoyc` | только docs (Issues, шаблон PR) |
| 04.10.2026 01:38 | `ecfafb1` | `chicken-fit-cafe-mod49awb1-…vercel.app` | только docs (setup/env, runbook'и), скрипты тестов |
| 04.10.2026 01:47 | `d403800` | `dpl_9P2KGDskBYftHEuscq7uqJhoS2mv` | только docs (история миграций выровнена) |
| 04.10.2026 15:20 | `ceac3c6` | `dpl_H2dsGiR13Mym5giz8xh1owHFz5bi` (`chicken-fit-cafe-pgglekcnx-…vercel.app`) | fix: оплата закрывает заказ и освобождает стол; печать только по выбору; метрики чека v1. Без миграций. Откат → `d403800` (`dpl_9P2KGDskBYftHEuscq7uqJhoS2mv`) |
| 04.10.2026 15:23 | `49161e0` | `dpl_AZKD6asHkNdKfPLC86XczNPEqxyk` (`chicken-fit-cafe-hzrkdo355-…vercel.app`) | только docs (запись деплоя `ceac3c6`) |
| 07.10.2026 23:45 | `063b559` (PR #14 `ux/v3` → main, merge commit) | `dpl_4UXbrK3NmP8GCDY8orR1QM9H6XvH` (`chicken-fit-cafe-isllgfam5-…vercel.app`) | v3: редизайн кассы, показатели зала, состояния и таймеры столов, отмена/возобновление без PIN, фото блюд в Storage, гостевое меню из БД; fix чека 80 мм (`68601c0`, по центру ленты). Миграции 0011–0014 применены до мержа (23:42). Закрыты #6 #8 #9 #10 #11 #12. Бэкап перед деплоем — схема `backup_20261007` в прод-БД. Сверка после деплоя: 383 заказа, 33 379 770 сум, 1119 позиций — совпадает; тестовые чеки отрендерены с CSS прода (`receipt-render.mjs`): 72 мм по центру листа 80 мм, правая колонка не обрезана. Откат → `dpl_AZKD6asHkNdKfPLC86XczNPEqxyk` |

## Перенос с v1 (выполнен 03.10.2026; путь спасения остаётся в коде)
При открытии v2 на устройстве со старыми данными снимок localStorage уходит в IndexedDB и на сервер, после входа — импорт
(`source='legacy_rescue'`) и сверка по дням в разделе «Бэкап». Проверка в SQL:
```sql
select count(*), max(received_at) from legacy_snapshots;
select business_date, count(*), sum(total_amount) from orders where source = 'legacy_rescue' group by 1 order by 1;
```
