'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
  type FormEvent,
} from 'react'
import { Lock, Delete, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react'

const COOKIE_NAME = 'cf-pos-auth'
const COOKIE_DAYS = 30
const SESSION_USER_KEY = 'cf-pos-user'

export type CashierUser = {
  name: string
  role: 'admin' | 'cashier' | 'kitchen'
  pin: string
}

export const KNOWN_USERS: CashierUser[] = [
  { name: 'Кассир 1', role: 'cashier', pin: '1234' },
  { name: 'Кассир 2', role: 'cashier', pin: '5678' },
  { name: 'Шеф-повар', role: 'kitchen', pin: '0000' },
  { name: 'Администратор', role: 'admin', pin: '12345678' },
]

function setCookie(name: string, value: string, days: number) {
  if (typeof document === 'undefined') return
  const d = new Date()
  d.setTime(d.getTime() + days * 864e5)
  document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/admin;SameSite=Strict`
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/admin;`
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? match[1] : null
}

type AuthContextType = {
  user: CashierUser | null
  lockScreen: () => void
  isAuthed: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  lockScreen: () => {},
  isAuthed: false,
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(false)
  const [currentUser, setCurrentUser] = useState<CashierUser | null>(null)
  const [checking, setChecking] = useState(true)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  const lockScreen = useCallback(() => {
    deleteCookie(COOKIE_NAME)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_USER_KEY)
    }
    setAuthed(false)
    setCurrentUser(null)
    setPassword('')
  }, [])

  useEffect(() => {
    const token = getCookie(COOKIE_NAME)
    if (token === 'yes') {
      setAuthed(true)
      const stored = localStorage.getItem(SESSION_USER_KEY)
      if (stored) {
        try {
          setCurrentUser(JSON.parse(stored))
        } catch {}
      }
    }
    setChecking(false)
  }, [])

  // Авто-блокировка при бездействии 15 минут
  useEffect(() => {
    if (!authed) return
    let timeout: NodeJS.Timeout

    const resetTimer = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        lockScreen()
      }, 15 * 60 * 1000) // 15 мин
    }

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach((ev) => window.addEventListener(ev, resetTimer))
    resetTimer()

    return () => {
      clearTimeout(timeout)
      events.forEach((ev) => window.removeEventListener(ev, resetTimer))
    }
  }, [authed, lockScreen])

  function checkAndLogin(pinToTest: string) {
    const found = KNOWN_USERS.find((u) => u.pin === pinToTest)
    if (found) {
      setCookie(COOKIE_NAME, 'yes', COOKIE_DAYS)
      localStorage.setItem(SESSION_USER_KEY, JSON.stringify(found))
      setCurrentUser(found)
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
    const found = KNOWN_USERS.find((u) => u.pin === next)
    if (found) {
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

  return (
    <AuthContext.Provider value={{ user: currentUser, lockScreen, isAuthed: authed }}>
      {authed ? (
        children
      ) : (
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white p-4 select-none">
          <div className="w-full max-w-sm rounded-3xl bg-zinc-900 border border-zinc-800 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="text-center space-y-1">
              <div className="flex size-12 mx-auto items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 mb-2">
                <Lock className="size-6" />
              </div>
              <h1 className="text-2xl font-black tracking-tight">
                Chicken<span className="text-amber-500">Fit</span> POS
              </h1>
              <p className="text-xs text-zinc-400 font-medium">Сенсорный вход кассира / повара</p>
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
                  <span className="text-zinc-600 text-sm tracking-normal font-sans">Введите PIN</span>
                ) : (
                  '•'.repeat(password.length)
                )}
              </div>

              {error && (
                <p className="text-center text-xs text-red-400 font-semibold animate-pulse">
                  Неверный PIN (Кассир: 1234, Кухня: 0000)
                </p>
              )}

              {/* Сенсорный PIN-пад */}
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
                <span>Войти в систему</span>
                <ArrowRight className="size-5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  )
}
