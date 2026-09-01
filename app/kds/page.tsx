'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ChefHat,
  Maximize2,
  Minimize2,
  ArrowLeft,
  Sun,
  Moon,
  Tv,
} from 'lucide-react'
import { fetchTodayOrders, subscribeToOrders, type Order } from '@/lib/orders'
import { useTheme } from '@/lib/theme'
import { KdsScreen } from '@/components/pos/kds-screen'

export default function StandaloneKdsPage() {
  const { isDark, toggleTheme } = useTheme()
  const [orders, setOrders] = useState<Order[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentTime, setCurrentTime] = useState('')

  const reloadOrders = useCallback(async () => {
    const data = await fetchTodayOrders()
    setOrders(data)
  }, [])

  useEffect(() => {
    reloadOrders()
    const unsubscribe = subscribeToOrders(() => {
      reloadOrders()
    })
    return () => unsubscribe()
  }, [reloadOrders])

  useEffect(() => {
    const updateTime = () => {
      const d = new Date()
      setCurrentTime(
        d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      )
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  return (
    <div className="flex h-screen w-full flex-col bg-background text-foreground overflow-hidden">
      {/* Верхняя панель кухонного экрана */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/95 px-4 sm:px-6 backdrop-blur-md z-10 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-orange-500 text-white font-black text-sm shadow-xs">
            <ChefHat className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-base tracking-wider uppercase">
                CHICKEN<span className="text-amber-500">FIT</span> KDS
              </span>
              <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-500 animate-pulse">
                ● ЭКРАН КУХНИ
              </span>
            </div>
          </div>
        </div>

        {/* Часы и системные кнопки */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 font-mono text-sm font-bold text-muted-foreground bg-secondary/60 px-3 py-1 rounded-xl border border-border">
            <span>{currentTime}</span>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex items-center justify-center size-8 rounded-xl border border-border bg-secondary text-foreground transition hover:border-amber-500 cursor-pointer shadow-2xs"
            title={isFullscreen ? 'Выйти из полноэкранного режима' : 'На весь экран'}
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center justify-center size-8 rounded-xl border border-border bg-secondary text-foreground transition hover:border-amber-500 cursor-pointer shadow-2xs"
            title={isDark ? 'Светлая тема' : 'Тёмная тема'}
          >
            {isDark ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4 text-zinc-700" />}
          </button>

          <Link
            href="/admin"
            className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
            title="Перейти в админку"
          >
            <ArrowLeft className="size-3.5" />
            <span className="hidden md:inline">В панель</span>
          </Link>
        </div>
      </header>

      {/* Основная рабочая область KDS */}
      <main className="flex-1 overflow-hidden p-4 sm:p-6">
        <KdsScreen orders={orders} onRefresh={reloadOrders} />
      </main>
    </div>
  )
}
