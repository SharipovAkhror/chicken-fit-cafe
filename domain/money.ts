/** Деньги — целые сумы (UZS). Никаких копеек и плавающей точки в итогах. */

export const roundUZS = (n: number): number => Math.round(Number.isFinite(n) ? n : 0)

/** 125000 -> "125 000" (неразрывный пробел как разделитель тысяч). */
export function formatUZS(n: number): string {
  return String(roundUZS(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0')
}

export const formatSum = (n: number): string => `${formatUZS(n)}\u00A0сум`
