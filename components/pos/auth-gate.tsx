'use client'

import { useState, useEffect, type ReactNode, type FormEvent } from 'react'

const COOKIE_NAME = 'cf-pos-auth'
const COOKIE_DAYS = 30

/**
 * Простой гейт по паролю. Пароль сверяется на клиенте (для MVP достаточно).
 * Правильный пароль сохраняется в cookie, чтобы не вводить каждый раз.
 *
 * Пароль по умолчанию: «chickenfit» — можно поменять ниже.
 */
const ADMIN_PASSWORD = 'chickenfit'

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

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      setCookie(COOKIE_NAME, 'yes', COOKIE_DAYS)
      setAuthed(true)
      setError(false)
    } else {
      setError(true)
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    )
  }

  if (authed) return <>{children}</>

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-5 rounded-2xl bg-white/5 p-8 backdrop-blur"
      >
        <div className="text-center">
          <p className="text-2xl font-bold">
            Chicken<span className="text-amber-400">Fit</span>
          </p>
          <p className="mt-1 text-sm text-white/50">Касса · вход</p>
        </div>

        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setError(false)
          }}
          placeholder="Пароль"
          autoFocus
          className={`rounded-xl border bg-white/5 px-4 py-3 text-center text-lg outline-none transition placeholder:text-white/30 focus:border-amber-400/60 ${
            error ? 'border-red-500' : 'border-white/10'
          }`}
        />

        {error && (
          <p className="text-center text-sm text-red-400">Неверный пароль</p>
        )}

        <button
          type="submit"
          className="rounded-xl bg-amber-500 py-3 text-lg font-semibold text-black transition hover:bg-amber-400 active:scale-[0.98]"
        >
          Войти
        </button>
      </form>
    </div>
  )
}
