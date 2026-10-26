import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
export const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined
if (!supabaseUrl || !supabaseKey) throw new Error('SUPABASE_CONFIG_MISSING')
const memory = new Map<string, string>()
const storage = {
  getItem(key: string) {
    try {
      return sessionStorage.getItem(key)
    } catch {
      return memory.get(key) ?? null
    }
  },
  setItem(key: string, value: string) {
    try {
      sessionStorage.setItem(key, value)
    } catch {
      memory.set(key, value)
    }
  },
  removeItem(key: string) {
    try {
      sessionStorage.removeItem(key)
    } catch {
      memory.delete(key)
    }
  },
}
export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: (url, init) =>
      fetch(url, { ...init, signal: init?.signal ?? AbortSignal.timeout(12000) }),
  },
  auth: {
    storage,
    storageKey: 'gambit-auth',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})
