# Промпты image-gen (agent-only craft path)

Owner = единственный вкус. Human freelance designer — **не** в процессе.  
Агент готовит промпты; owner генерит в Grok Imagine / Gemini.

| Файл | Назначение |
| --- | --- |
| [`claude-design-chain.md`](claude-design-chain.md) | **Основное:** 8 сессий Claude Design, SYSTEM + copy-paste |
| [`utp-samsa-burger-pack.md`](utp-samsa-burger-pack.md) | UTP context (бургер×самса) |
| [`MASTER-FACADE-POSTER.md`](MASTER-FACADE-POSTER.md) | Master-prompt плаката 2×1 (legacy / facade) |

Порядок: `claude-design-chain.md` → 1 чат = 1 сессия → 8 кадров → ♥ → refine → следующая сессия.
