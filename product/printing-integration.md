---
title: "Интеграция печати чеков (ESC/POS)"
status: draft
owner: product-developer
updated: 2026-08-29
sources:
  - operations/equipment-spec.md
  - specification: "ESC/POS Command Reference (Legacy), Thermal Printer Manufacturers"
---

# Интеграция печати чеков (ESC/POS)

## Обзор

Печать на чековый принтер реализуется через **ESC/POS** — минимальный протокол сырых команд на TCP-порт 9100. Нет SDK, нет драйверов, нет платформенных различий.

**Единая база кода печати работает на:**
- iOS (Swift)
- Android (Kotlin/Java)
- Node.js / Python (сервер)
- Любой язык с TCP-сокетом

## Принцип

```
TCP соединение на IP:9100
    ↓
Отправить ESC/POS команды (массив байтов)
    ↓
Принтер: печать + разрез + возврат в режим ожидания
```

Нет обратной связи, нет квитанций — это fire-and-forget. Если принтер не доступен, соединение падает на уровне OS (таймаут 5–30 сек).

## Архитектура

### 1. Слой абстракции (приложение)

```typescript
interface Receipt {
  items: ReceiptItem[];
  subtotal: number;        // сумы
  tax: number;             // сумы
  total: number;           // сумы
  paymentMethod: "cash" | "card";
  timestamp: Date;
}

async function printReceipt(receipt: Receipt): Promise<void> {
  const commands = buildEscPosCommands(receipt);
  await sendToPrinter(commands);
}
```

Приложение вообще не знает про ESC/POS — только подготавливает данные.

### 2. Сборка команд (ESC/POS generator)

```typescript
function buildEscPosCommands(receipt: Receipt): Uint8Array {
  const buf = [];

  // Инициализация
  buf.push(...ESC_INIT);

  // Заголовок
  buf.push(...TEXT("Chicken Fit Café", "center", "bold"));
  buf.push(...TEXT("ИНН: 123456789", "center"));

  // Товары
  buf.push(...TABLE_HEADER("Наименование", "Кол.", "Сумма"));
  for (const item of receipt.items) {
    buf.push(...TABLE_ROW(item.name, item.qty, item.total));
  }

  buf.push(...SEPARATOR);

  // Итоги
  buf.push(...TEXT(`Товары:     ${receipt.subtotal} сум`, "right"));
  buf.push(...TEXT(`Налог:      ${receipt.tax} сум`, "right"));
  buf.push(...TEXT(`Итого:      ${receipt.total} сум`, "right", "bold"));

  // Оплата
  buf.push(...TEXT(`Оплачено ${receipt.paymentMethod === "cash" ? "наличью" : "картой"}`, "center"));
  buf.push(...TEXT(receipt.timestamp.toLocaleString("ru-UZ"), "center", "small"));

  // Разрез и возврат
  buf.push(...ESC_CUT);
  buf.push(...ESC_INIT);

  return new Uint8Array(buf.flat());
}
```

### 3. Отправка на принтер

#### iOS (Swift)

```swift
import Network

func sendToPrinter(_ data: Data) async throws {
  let connection = NWConnection(
    host: NWEndpoint.Host("192.168.1.100"),
    port: NWEndpoint.Port(9100)!,
    using: .tcp
  )
  
  connection.stateUpdateHandler = { state in
    switch state {
    case .ready:
      connection.send(content: data, isComplete: true) { _ in }
    case .failed(let error):
      print("Printer error: \(error)")
    default:
      break
    }
  }
  
  connection.start(queue: .main)
  
  // Подождать отправки (упрощённо, в реале нужен Combine)
  try await Task.sleep(nanoseconds: 5_000_000_000)
  connection.cancel()
}
```

#### Android (Kotlin)

```kotlin
import java.net.Socket

suspend fun sendToPrinter(data: ByteArray) = withContext(Dispatchers.IO) {
  val socket = Socket("192.168.1.100", 9100)
  try {
    socket.outputStream.write(data)
    socket.outputStream.flush()
  } finally {
    socket.close()
  }
}
```

#### Node.js / TypeScript

```typescript
import { Socket } from "net";

async function sendToPrinter(data: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error("Printer timeout"));
    }, 10000);

    socket.on("error", reject);
    socket.on("close", () => {
      clearTimeout(timeout);
      resolve();
    });

    socket.connect(9100, process.env.PRINTER_IP || "192.168.1.100", () => {
      socket.write(data, () => socket.end());
    });
  });
}
```

## Команды ESC/POS

| Команда | Байты | Назначение |
|---|---|---|
| **INIT** | `[27, 64]` | Инициализация, очистка буфера |
| **LF** | `[10]` | Перевод строки |
| **FF** | `[12]` | Переход на новую страницу (редко) |
| **ESC E m** | `[27, 69, 1]` | Жирный текст (вкл) |
| **ESC E m** | `[27, 69, 0]` | Жирный текст (выкл) |
| **ESC a n** | `[27, 97, 0/1/2]` | Выравнивание: слева (0), центр (1), справа (2) |
| **ESC - n** | `[27, 45, 1]` | Подчёркивание (вкл) |
| **ESC - n** | `[27, 45, 0]` | Подчёркивание (выкл) |
| **GS ! n** | `[29, 33, n]` | Размер шрифта: n = ширина × высота |
| **GS h n** | `[29, 104, n]` | Высота QR-кода |
| **GS k m d** | `[29, 107, m, ...d]` | Печать QR (m = 31 для QR 2D) |
| **GS V m** | `[29, 86, 0]` | Полный разрез бумаги |
| **GS V m** | `[29, 86, 1]` | Частичный разрез |

### Пример: печать текста

```typescript
const ESC = 0x1B;
const LF = 0x0A;
const ALIGN_CENTER = [ESC, 0x61, 1];
const ALIGN_RIGHT = [ESC, 0x61, 2];
const BOLD_ON = [ESC, 0x45, 1];
const BOLD_OFF = [ESC, 0x45, 0];

function TEXT(text: string, align: "left" | "center" | "right" = "left", bold = false): number[] {
  const cmds = [];
  
  if (align === "center") cmds.push(...ALIGN_CENTER);
  if (align === "right") cmds.push(...ALIGN_RIGHT);
  if (bold) cmds.push(...BOLD_ON);
  
  cmds.push(...text.split("").map(c => c.charCodeAt(0)));
  cmds.push(LF);
  
  if (bold) cmds.push(...BOLD_OFF);
  
  return cmds;
}
```

## QR на чеке

Печать QR-кода прямо на чеке (ссылка на детали заказа, ссылка на меню и т.д.):

```typescript
// Пример: QR с ссылкой на заказ
const qrData = `https://chicken.uz/order/${orderId}`;

function QR_CODE(data: string): number[] {
  const ESC = 0x1B;
  const GS = 0x1D;
  
  // GS k m d1 d2 ... dk
  // m = 31 (QR 2D-Barcode), d = UTF-8 строка
  const encoded = new TextEncoder().encode(data);
  const cmds = [GS, 0x6B, 31];  // GS k 31 = QR mode
  cmds.push(encoded.length);    // Длина данных
  cmds.push(...encoded);
  cmds.push(0x00);              // Завершитель
  
  return cmds;
}
```

**Примечание:** разные производители могут требовать разные последовательности. Проверить на конкретном принтере перед выпуском.

## Обработка ошибок

### Принтер не доступен

```typescript
try {
  await sendToPrinter(commands);
} catch (error) {
  if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
    // Принтер выключен или адрес неверный
    showError("Принтер не доступен. Проверьте кабель и IP.");
  }
}
```

### Принтер занят

Чековые принтеры обычно берут команды в буфер и печатают последовательно. Не должно быть «занято» в классическом смысле. Если отправлять чаще, чем принтер печатает, просто выстраивается очередь на TCP-уровне.

### Статический IP

**Критично:** установить принтеру статический IP через сервисное меню (утилита, кнопку или веб-интерфейс). На DHCP он может переполучить адрес после перезагрузки маршрутизатора.

```bash
# На ноутбуке / сервере проверить доступность:
ping 192.168.1.100  # замени на свой IP
```

Если `ping` отвечает — принтер доступен по сети и готов.

## Интеграция в приложение

### Минимальная касса (Node.js + Vue)

```typescript
// backend/printers.ts
import { Router } from "express";

const router = Router();

router.post("/print-receipt", async (req, res) => {
  const { receipt } = req.body;
  
  try {
    const commands = buildEscPosCommands(receipt);
    await sendToPrinter(Buffer.from(commands));
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

```typescript
// frontend/components/CashRegister.vue
export default {
  methods: {
    async printReceipt() {
      const response = await fetch("/api/print-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receipt: this.currentReceipt }),
      });

      if (!response.ok) {
        alert("Ошибка печати. Проверьте принтер.");
      }
    }
  }
};
```

## Тестирование

### Без реального принтера

```typescript
// Mock-функция для разработки
function sendToPrinterMock(data: Uint8Array): Promise<void> {
  console.log("Printed:", data.length, "bytes");
  return Promise.resolve();
}

// Переключить в коде
const send = process.env.MOCK_PRINTER ? sendToPrinterMock : sendToPrinter;
```

### С реальным принтером

1. Убедиться, что принтер в сети: `ping <IP>`.
2. Отправить стартовую команду (INIT) — принтер должен щелкнуть / издать звук.
3. Отправить текст — должно напечатать.
4. Отправить разрез — нож должен сработать.

## Производительность

- **Один чек:** ~1–3 сек печать + ~2 сек разрез. Итого ~5 сек.
- **Очередь:** если кассир печатает чек 2 за 2 секунды, очередь на принтере ~1–2 чека (буфер ~64 KB).
- **Сеть:** TCP соединение переустанавливается на каждый чек (0.1–0.5 сек). Если это узкое место, переейти на persistent connection (сложнее, редко нужно).

## Безопасность

- **Данные:** чек содержит суммы и способ оплаты (открыто). Личные данные гостя **не печатаются**.
- **Сеть:** IP принтера приватный (192.168.x.x). Если касса и принтер в одной сети — достаточно.
- **Фискальность:** печать чека — это приложение, а не принтер. Требования к фискальности (Soliq, QR-признак) решаются на уровне бизнес-логики.

## Смежные документы

- [`operations/equipment-spec.md`](../operations/equipment-spec.md) — выбор и приёмка принтера
- [`product/specification.md`](../product/specification.md) — спецификация QR-меню (не касается печати)
- [`CONTRIBUTING.md`](../CONTRIBUTING.md) — процесс интеграции печати

## Ссылки

- [ESC/POS Command Reference (PDF)](https://www.epson-biz.com/modules/pos/files/esc_p.pdf)
- [Thermal Printer Setup Guide](https://www.pos-tech.com/guides/thermal-printer-setup)
