import { useEffect, useState } from 'react'

export type Theme = 'pixel' | 'clean'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('pokemon-theme') as Theme | null
    return stored ?? 'pixel'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('pokemon-theme', theme)
  }, [theme])

  const toggle = () => setTheme(t => t === 'pixel' ? 'clean' : 'pixel')

  return { theme, toggle }
}
