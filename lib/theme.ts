'use client'

import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const THEME_KEY = 'chickenfit_theme_v2'

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

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light')

  // тема читается из localStorage только после гидрации (иначе расхождение SSR/клиент)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY) as Theme | null
      if (saved === 'light' || saved === 'dark') {
        setTheme(saved)
        applyTheme(saved)
      } else {
        // Default to clean, minimalist Light theme as requested
        setTheme('light')
        applyTheme('light')
      }
    } catch {}
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next)
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {}
  }

  return { theme, toggleTheme, isDark: theme === 'dark' }
}
