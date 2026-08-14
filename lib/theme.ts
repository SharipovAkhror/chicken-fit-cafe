'use client'

import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const THEME_KEY = 'chickenfit_theme_v1'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY) as Theme | null
      if (saved === 'light' || saved === 'dark') {
        setTheme(saved)
        applyTheme(saved)
      } else {
        // Default to dark for premium look, or check system
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        const initial = prefersDark ? 'dark' : 'light'
        setTheme(initial)
        applyTheme(initial)
      }
    } catch {}
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next)
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {}
  }

  function applyTheme(t: Theme) {
    if (typeof document !== 'undefined') {
      const root = document.documentElement
      if (t === 'dark') {
        root.classList.add('dark')
        root.classList.remove('light')
        root.style.colorScheme = 'dark'
      } else {
        root.classList.remove('dark')
        root.classList.add('light')
        root.style.colorScheme = 'light'
      }
    }
  }

  return { theme, toggleTheme, isDark: theme === 'dark' }
}
