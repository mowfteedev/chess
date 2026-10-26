import { useEffect, useState } from 'react'

export function usePreference<T>(
  key: string,
  fallback: T,
  isValid: (value: unknown) => value is T,
) {
  const storageKey = `gambit:${key}`
  const [value, setValue] = useState<T>(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(storageKey) ?? 'null')
      return isValid(stored) ? stored : fallback
    } catch {
      return fallback
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value))
    } catch {
      /* Preferences are optional. */
    }
  }, [storageKey, value])
  return [value, setValue] as const
}
