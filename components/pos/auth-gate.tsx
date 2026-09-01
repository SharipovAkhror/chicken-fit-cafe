'use client'

import { useState, useEffect, type ReactNode, type FormEvent } from 'react'
import { Lock, Delete, ArrowRight, ShieldCheck } from 'lucide-react'

const COOKIE_NAME = 'cf-pos-auth'
const COOKIE_DAYS = 30

/**
 * Пароль доступа к кассе (по умолчанию «12345678» или «1234»).
 */
const ADMIN_PASSWORDS = ['12345678', '1234']

function setCookie(name: string, value: string, days: number) {
  const d = new Date()
  d.setTime(d.getTime() + days * 864e5)
  document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/admin;SameSite=Strict`
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? match[1] : null
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    const token = getCookie(COOKIE_NAME)
    if (token === 'yes') setAuthed(true)
    setChecking(false)
  }, [])

  function checkAndLogin(pinToTest: string) {
    if (ADMIN_PASSWORDS.includes(pinToTest)) {
      setCookie(COOKIE_NAME, 'yes', COOKIE_DAYS)
      setAuthed(true)
      setError(false)
    } else {
      setError(true)
      setTimeout(() => setError(false), 2000)
    }
  }

  function handleSubmit(e?: FormEvent) {
    if (e) e.preventDefault()
    checkAndLogin(password)
  }

  function handleKeypadPress(num: string) {
    if (password.length >= 8) return
    const next = password + num
    setPassword(next)
    setError(false)
    if (ADMIN_PASSWORDS.includes(next)) {
      checkAndLogin(next)
    }
  }

  function handleBackspace() {
    setPassword((prev) => prev.slice(0, -1))
    setError(false)
  }

  function handleClear() {
    setPassword('')
    setError(false)
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-amber-500" />
      </div>
    )
  }

  if (authed) return <>{children}</>

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white p-4">
      <div className="w-full max-w-sm rounded-3xl bg-zinc-900 border border-zinc-800 p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-1">
          <div className="flex size-12 mx-auto items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 mb-2">
            <Lock className="size-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            Chicken<span className="text-amber-500">Fit</span> POS
          </h1>
          <p className="text-xs text-zinc-400 font-medium">Сенсорный терминал кассира</p>
        </div>

        {/* Дисплей ввода PIN */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            className={`flex items-center justify-center h-14 rounded-2xl border bg-black/60 px-4 text-center text-2xl tracking-[0.3em] font-mono transition ${
              error
                ? 'border-red-500 text-red-400 animate-shake'
                : 'border-zinc-700 text-amber-400 focus-within:border-amber-500'
            }`}
          >
            {password.length === 0 ? (
              <span className="text-zinc-600 text-sm tracking-normal font-sans">Введите PIN кассира</span>
            ) : (
              '•'.repeat(password.length)
            )}
          </div>

          {error && (
            <p className="text-center text-xs text-red-400 font-semibold animate-pulse">
              Неверный PIN (по умолчанию: 12345678)
            </p>
          )}

          {/* Сенсорный PIN-пад для экрана моноблока */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => handleKeypadPress(n)}
                className="flex h-14 items-center justify-center rounded-2xl bg-zinc-800/80 hover:bg-zinc-700 active:scale-95 text-xl font-bold font-mono transition border border-zinc-700/50 cursor-pointer shadow-xs"
              >
                {n}
              </button>
            ))}

            <button
              type="button"
              onClick={handleClear}
              className="flex h-14 items-center justify-center rounded-2xl bg-zinc-800/40 hover:bg-zinc-800 active:scale-95 text-xs font-bold text-zinc-400 transition border border-zinc-700/30 cursor-pointer"
            >
              СБРОС
            </button>

            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              className="flex h-14 items-center justify-center rounded-2xl bg-zinc-800/80 hover:bg-zinc-700 active:scale-95 text-xl font-bold font-mono transition border border-zinc-700/50 cursor-pointer shadow-xs"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleBackspace}
              className="flex h-14 items-center justify-center rounded-2xl bg-zinc-800/40 hover:bg-zinc-800 active:scale-95 text-zinc-400 transition border border-zinc-700/30 cursor-pointer"
              aria-label="Удалить"
            >
              <Delete className="size-5" />
            </button>
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-400 py-3.5 text-base font-bold text-black transition active:scale-[0.98] shadow-lg shadow-amber-500/20 cursor-pointer mt-2"
          >
            <span>Войти в кассу</span>
            <ArrowRight className="size-5" />
          </button>
        </form>
      </div>
    </div>
  )
}
