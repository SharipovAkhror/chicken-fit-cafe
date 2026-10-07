/**
 * Фото блюда с планшета/телефона: любое изображение из галереи или камеры → WebP (JPEG, если браузер не умеет WebP),
 * длинная сторона ≤ 800 px, качество 0.8→0.5 до ≤ 150 КБ; миниатюра 240×240 для карточек кассы.
 * Перерисовка на canvas убирает EXIF (геометка, модель телефона); ориентация учитывается (imageOrientation: from-image).
 */
export const PHOTO_MAX_SIDE = 800
export const THUMB_SIDE = 240
export const PHOTO_TARGET_BYTES = 150 * 1024
export const PHOTO_INPUT_MAX_BYTES = 30 * 1024 * 1024

export type CompressedPhoto = { main: Blob; thumb: Blob; ext: 'webp' | 'jpg'; width: number; height: number }

/** Размер с сохранением пропорций: длинная сторона не больше max. */
export function fitSize(w: number, h: number, max: number): { w: number; h: number } {
  const k = Math.min(1, max / Math.max(w, h, 1))
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) }
}

/**
 * Ссылка на миниатюру: фото из Storage (items/<id>.webp → items/<id>-t.webp) или из public/menu (→ /menu/thumb/<имя>.webp,
 * 240×240 ~12 КБ — касса не тянет оригиналы). Прочие ссылки без изменений.
 */
export function thumbOf(url: string | null | undefined): string | null {
  if (!url) return null
  const m = /^\/menu\/([^/]+)\.(jpe?g|png|webp)$/i.exec(url)
  if (m) return `/menu/thumb/${m[1]}.webp`
  return /\/menu-photos\/items\/[0-9a-f-]+\.(webp|jpg)$/i.test(url) ? url.replace(/\.(webp|jpg)$/i, '-t.$1') : url
}

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  try { return await createImageBitmap(file, { imageOrientation: 'from-image' }) } catch { /* старый Safari */ }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return img
  } finally { URL.revokeObjectURL(url) }
}

const toBlob = (c: HTMLCanvasElement, type: string, q: number) => new Promise<Blob | null>((res) => c.toBlob(res, type, q))

function draw(src: ImageBitmap | HTMLImageElement, sw: number, sh: number, w: number, h: number, crop = false): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const g = c.getContext('2d')!
  g.fillStyle = '#FDFCF9' // для JPEG: прозрачный PNG не станет чёрным
  g.fillRect(0, 0, w, h)
  g.imageSmoothingQuality = 'high'
  if (crop) { const s = Math.min(sw, sh); g.drawImage(src, (sw - s) / 2, (sh - s) / 2, s, s, 0, 0, w, h) }
  else g.drawImage(src, 0, 0, sw, sh, 0, 0, w, h)
  return c
}

export async function compressPhoto(file: File): Promise<CompressedPhoto> {
  if (!file.type.startsWith('image/') && !/\.(heic|heif|jpe?g|png|webp|gif|bmp)$/i.test(file.name)) throw new Error('Это не изображение')
  if (file.size > PHOTO_INPUT_MAX_BYTES) throw new Error('Файл больше 30 МБ')
  let src: ImageBitmap | HTMLImageElement
  try { src = await decode(file) } catch { throw new Error('Не удалось открыть фото. Сохраните его как JPEG и попробуйте снова') }
  const sw = 'naturalWidth' in src ? src.naturalWidth : src.width
  const sh = 'naturalHeight' in src ? src.naturalHeight : src.height
  let side = PHOTO_MAX_SIDE
  let type = 'image/webp'
  let out: Blob | null = null
  let size = fitSize(sw, sh, side)
  for (let pass = 0; pass < 3 && (!out || out.size > PHOTO_TARGET_BYTES); pass++) {
    size = fitSize(sw, sh, side)
    const c = draw(src, sw, sh, size.w, size.h)
    for (const q of [0.8, 0.7, 0.6, 0.5]) {
      out = await toBlob(c, type, q)
      if (out && out.type !== type) { type = 'image/jpeg'; out = await toBlob(c, type, q) } // Safari < 16: нет WebP-кодера
      if (out && out.size <= PHOTO_TARGET_BYTES) break
    }
    side = Math.round(side * 0.8)
  }
  if (!out) throw new Error('Браузер не смог сжать фото')
  const thumb = await toBlob(draw(src, sw, sh, THUMB_SIDE, THUMB_SIDE, true), type, 0.75)
  if ('close' in src) src.close()
  return { main: out, thumb: thumb ?? out, ext: type === 'image/webp' ? 'webp' : 'jpg', width: size.w, height: size.h }
}
