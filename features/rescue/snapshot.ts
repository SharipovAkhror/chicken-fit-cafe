/**
 * Сырой снимок legacy-ключей localStorage. Только чтение: getItem/key/length.
 * Хеш считается по содержимому ключей (не по времени), поэтому одинаковые данные дают одинаковый sha256 —
 * это основа дедупликации на сервере и в IndexedDB.
 */
import { sha256Hex } from '@/domain/ids'
import { isLegacyKey, LEGACY_KEYS } from './legacy-keys'

export type ReadonlyStorage = Pick<Storage, 'length' | 'key' | 'getItem'>

export type LegacySnapshot = {
  format: 'chickenfit-legacy-snapshot/1'
  sha256: string
  deviceId: string
  origin: string
  userAgent: string
  capturedAt: string
  keyCount: number
  sizeBytes: number
  /** ключ -> сырая строка ровно как в localStorage (кроме маскировки PIN в cf-pos-user) */
  keys: Record<string, string>
}

export function readLegacyKeys(storage: ReadonlyStorage): Record<string, string> {
  const out: Record<string, string> = {}
  const n = storage.length
  for (let i = 0; i < n; i++) {
    const k = storage.key(i)
    if (k === null || !isLegacyKey(k)) continue
    const v = storage.getItem(k)
    if (v !== null) out[k] = v
  }
  return out
}

/** PIN в cf-pos-user хранился открытым текстом — в снимок не берём. */
function maskSecrets(keys: Record<string, string>): Record<string, string> {
  const raw = keys[LEGACY_KEYS.sessionUser]
  if (raw === undefined) return keys
  let masked = raw
  try {
    const u = JSON.parse(raw)
    if (u && typeof u === 'object' && 'pin' in u) masked = JSON.stringify({ ...u, pin: '***' })
  } catch {
    masked = '"***"'
  }
  return { ...keys, [LEGACY_KEYS.sessionUser]: masked }
}

export function canonicalKeysJson(keys: Record<string, string>): string {
  return JSON.stringify(Object.keys(keys).sort().map((k) => [k, keys[k]]))
}

export async function captureSnapshot(
  storage: ReadonlyStorage,
  meta: { deviceId: string; origin?: string; userAgent?: string; now?: Date },
): Promise<LegacySnapshot | null> {
  const keys = maskSecrets(readLegacyKeys(storage))
  const keyCount = Object.keys(keys).length
  if (keyCount === 0) return null
  const canonical = canonicalKeysJson(keys)
  return {
    format: 'chickenfit-legacy-snapshot/1',
    sha256: await sha256Hex(canonical),
    deviceId: meta.deviceId,
    origin: meta.origin ?? (typeof location !== 'undefined' ? location.origin : ''),
    userAgent: meta.userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : ''),
    capturedAt: (meta.now ?? new Date()).toISOString(),
    keyCount,
    sizeBytes: canonical.length,
    keys,
  }
}
