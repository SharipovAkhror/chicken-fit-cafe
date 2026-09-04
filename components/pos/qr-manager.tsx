'use client'

import { useState, useEffect, useMemo } from 'react'
import { Printer, Wifi, Download, Copy } from 'lucide-react'
import { SimpleQR } from '@/lib/qr-generator'

type Props = {
  defaultDomain?: string
}

export function QrManager({ defaultDomain = 'https://chickenfit.vercel.app' }: Props) {
  const [domain, setDomain] = useState(defaultDomain)
  const [table, setTable] = useState('1')
  const [lang, setLang] = useState<'ru' | 'uz' | 'en'>('ru')
  const [includeTableParam, setIncludeTableParam] = useState(true)
  const [showWifi, setShowWifi] = useState(false)
  const [wifiName, setWifiName] = useState('ChickenFit_Guest')
  const [wifiPass, setWifiPass] = useState('chicken2026')
  const [batchMode, setBatchMode] = useState(false)
  const [batchCount, setBatchCount] = useState(10)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost')) {
      setDomain(window.location.origin)
    }
  }, [])

  const currentUrl = useMemo(() => {
    let clean = domain.trim().replace(/\/+$/, '')
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `https://${clean}`
    }
    const path = lang === 'ru' ? '' : `/${lang}`
    const query = includeTableParam && table ? `?table=${encodeURIComponent(table)}` : ''
    return `${clean}${path}${query}`
  }, [domain, lang, includeTableParam, table])

  const qrSvg = useMemo(() => {
    try {
      return SimpleQR.toSVG(currentUrl, { size: 280, margin: 2, darkColor: '#18181b', lightColor: '#ffffff' })
    } catch (e) {
      return ''
    }
  }, [currentUrl])

  function handlePrint() {
    window.print()
  }

  function handleDownloadSvg(targetTable: string, targetUrl: string) {
    const svgContent = SimpleQR.toSVG(targetUrl, { size: 512, margin: 2, darkColor: '#000000', lightColor: '#ffffff' })
    const blob = new Blob([svgContent], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chickenfit-qr-table-${targetTable}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-full flex-col space-y-5 overflow-y-auto pr-1">
      {/* Верхняя шапка настроек (скрывается при печати) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h2 className="text-lg font-bold text-white">Генератор QR-кодов и Тейбл-тентов</h2>
          <p className="text-xs text-white/50">
            Готовые макеты для столов, наклеек и стоек кафе
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setBatchMode(!batchMode)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
              batchMode
                ? 'bg-amber-500 text-black'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
          >
            <Printer className="size-3.5" />
            <span>{batchMode ? `Серия (1–${batchCount})` : 'Серия столов'}</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-black shadow transition hover:bg-amber-400 cursor-pointer active:scale-95"
          >
            Распечатать макет
          </button>
        </div>
      </div>

      {/* Панель настроек (скрывается при печати) */}
      <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs sm:grid-cols-2 lg:grid-cols-4 print:hidden">
        <div>
          <label className="font-semibold text-white/70">Домен / Ссылка</label>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="https://chickenfit.vercel.app"
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white outline-none focus:border-amber-400/60"
          />
        </div>

        {!batchMode ? (
          <div>
            <label className="font-semibold text-white/70">Номер стола / Локация</label>
            <div className="mt-1 flex gap-1">
              <input
                type="text"
                value={table}
                onChange={(e) => setTable(e.target.value)}
                placeholder="1"
                className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white outline-none focus:border-amber-400/60"
              />
              <div className="flex gap-1">
                {['1', '2', '3', '4', 'Бар'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTable(t)}
                    className="rounded-lg bg-white/5 px-2 py-1 text-[11px] text-white/70 hover:bg-white/10"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <label className="font-semibold text-white/70">Количество столов в серии</label>
            <input
              type="number"
              min="1"
              max="50"
              value={batchCount}
              onChange={(e) => setBatchCount(parseInt(e.target.value, 10) || 1)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white outline-none focus:border-amber-400/60"
            />
          </div>
        )}

        <div>
          <label className="font-semibold text-white/70">Язык по умолчанию</label>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as 'ru' | 'uz' | 'en')}
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white outline-none"
          >
            <option value="ru" className="bg-zinc-900">Русский ( / )</option>
            <option value="uz" className="bg-zinc-900">O&apos;zbekcha ( /uz )</option>
            <option value="en" className="bg-zinc-900">English ( /en )</option>
          </select>
        </div>

        <div className="flex flex-col justify-end gap-2">
          <label className="flex items-center gap-2 cursor-pointer text-white/80">
            <input
              type="checkbox"
              checked={showWifi}
              onChange={(e) => setShowWifi(e.target.checked)}
              className="accent-amber-500"
            />
            <span>Добавить блок Wi-Fi</span>
          </label>
          {showWifi && (
            <div className="flex gap-2">
              <input
                type="text"
                value={wifiName}
                onChange={(e) => setWifiName(e.target.value)}
                placeholder="Сеть"
                className="w-1/2 rounded-lg border border-white/10 bg-white/5 p-1.5 text-[11px] text-white"
              />
              <input
                type="text"
                value={wifiPass}
                onChange={(e) => setWifiPass(e.target.value)}
                placeholder="Пароль"
                className="w-1/2 rounded-lg border border-white/10 bg-white/5 p-1.5 text-[11px] text-white"
              />
            </div>
          )}
        </div>
      </div>

      {/* Превью макета тейбл-тента для печати */}
      {!batchMode ? (
        <div className="flex flex-col items-center justify-center p-4 sm:p-8">
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border-4 border-amber-500/30 bg-white p-7 text-center text-zinc-950 shadow-2xl transition-all">
            {/* Декоративная рамка */}
            <div className="absolute inset-2 pointer-events-none rounded-2xl border border-amber-500/20" />

            {/* Логотип */}
            <div className="relative mb-2 flex items-center justify-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500 text-xs font-black text-black shadow">
                CF
              </div>
              <span className="text-2xl font-black tracking-tight text-zinc-950">
                Chicken<span className="text-amber-500">Fit</span>
              </span>
            </div>
            <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
              Кафе вкусной курочки
            </p>

            {/* Бейдж стола */}
            <div className="my-4 inline-block rounded-full bg-zinc-900 px-4 py-1 text-xs font-black tracking-wider text-amber-400 shadow">
              СТОЛ № {table}
            </div>

            {/* QR-код */}
            <div className="relative mx-auto my-2 flex size-60 items-center justify-center rounded-2xl border-2 border-zinc-100 bg-white p-3 shadow-inner">
              <div
                className="size-full [&>svg]:size-full [&>svg]:rounded-lg"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            </div>

            {/* Призыв к действию */}
            <h3 className="mt-3 text-base font-black text-zinc-900">
              ОТСКАНИРУЙТЕ ДЛЯ МЕНЮ
            </h3>
            <p className="text-xs text-zinc-600 mt-0.5">
              Наведите камеру телефона для просмотра блюд и цен
            </p>

            {/* Wi-Fi плашка */}
            {showWifi && (
              <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200/80 p-2.5 text-[11px] text-zinc-700">
                <p className="font-bold text-amber-900 inline-flex items-center gap-1">
                  <Wifi className="size-3.5 text-amber-700" />
                  <span>Гостевой Wi-Fi</span>
                </p>
                <p className="text-zinc-600 mt-0.5">
                  Сеть: <span className="font-semibold text-zinc-900">{wifiName}</span> · Пароль: <span className="font-semibold text-zinc-900">{wifiPass}</span>
                </p>
              </div>
            )}

            {/* Подвал карточки */}
            <p className="mt-4 text-[10px] font-medium text-zinc-400">
              ChickenFit · Самарканд, ул. Ибн Сина 136 · Тел: 93-380-2002
            </p>
          </div>

          {/* Кнопки действий */}
          <div className="mt-4 flex gap-3 print:hidden">
            <button
              type="button"
              onClick={() => handleDownloadSvg(table, currentUrl)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-800 dark:text-white transition hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer shadow-xs"
            >
              <Download className="size-3.5" />
              <span>Скачать SVG QR</span>
            </button>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(currentUrl)
                alert('Ссылка скопирована: ' + currentUrl)
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20 cursor-pointer"
            >
              <Copy className="size-3.5" />
              <span>Скопировать ссылку</span>
            </button>
          </div>
        </div>
      ) : (
        /* Режим печати всей серии столов */
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: batchCount }, (_, i) => String(i + 1)).map((num) => {
            let clean = domain.trim().replace(/\/+$/, '')
            if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
              clean = `https://${clean}`
            }
            const path = lang === 'ru' ? '' : `/${lang}`
            const query = includeTableParam ? `?table=${num}` : ''
            const url = `${clean}${path}${query}`
            const svg = SimpleQR.toSVG(url, { size: 220, margin: 2, darkColor: '#18181b', lightColor: '#ffffff' })

            return (
              <div
                key={num}
                className="relative overflow-hidden rounded-3xl border-2 border-amber-500/30 bg-white p-5 text-center text-zinc-950 shadow-md print:break-inside-avoid print:page-break-inside-avoid"
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500 text-xs font-black text-black">
                    CF
                  </span>
                  <span className="text-xl font-black text-zinc-950">
                    Chicken<span className="text-amber-500">Fit</span>
                  </span>
                </div>
                <div className="my-2 inline-block rounded-full bg-zinc-900 px-3 py-0.5 text-[11px] font-black text-amber-400">
                  СТОЛ № {num}
                </div>
                <div className="mx-auto my-1 flex size-44 items-center justify-center rounded-xl bg-white p-1">
                  <div
                    className="size-full [&>svg]:size-full"
                    dangerouslySetInnerHTML={{ __html: svg }}
                  />
                </div>
                <p className="text-xs font-black text-zinc-900 mt-1">ОТСКАНИРУЙТЕ ДЛЯ МЕНЮ</p>
                <p className="text-[9px] text-zinc-500">{url.replace(/^https?:\/\//, '')}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
