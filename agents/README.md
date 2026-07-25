# Контракты AI-ролей

Каждая роль работает строго в границах своего контракта и подчиняется общим
правилам из [`../AGENTS.md`](../AGENTS.md). Контракт описывает миссию, входы,
выходы, запреты, проверки, handoff, критерии приёмки и разрешённые пути.

## Ядро v1

| Роль | Файл | Основная область записи |
| :--- | :--- | :--- |
| Системный архитектор | [`system-architect.md`](system-architect.md) | `knowledge/`, `decisions/`, ОС |
| Бренд-стратег | [`brand-strategist.md`](brand-strategist.md) | `strategy/`, `brand/` |
| Визуальный дизайнер | [`visual-designer.md`](visual-designer.md) | `design/` |
| Операционный менеджер | [`operations-manager.md`](operations-manager.md) | `operations/` |
| Финансовый аналитик | [`financial-analyst.md`](financial-analyst.md) | `finance/` |
| Продуктовый разработчик | [`product-developer.md`](product-developer.md) | `product/` |

## Цепочка зависимостей

```
Системный архитектор (правила, факты, решения)
        │
Бренд-стратег ──→ Визуальный дизайнер
        │
Операционный менеджер ──┐
Финансовый аналитик ────┼──→ Продуктовый разработчик
```

Общий протокол передачи — [`handoff-protocol.md`](handoff-protocol.md).
