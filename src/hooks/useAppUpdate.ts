import { useCallback, useEffect, useState } from 'react'

export const APP_RELEASE = __APP_RELEASE__
interface Release {
  version: string
  revision: string
  builtAt: string
}
export function useAppUpdate() {
  const [available, setAvailable] = useState<Release | null>(null)
  const [status, setStatus] = useState<'idle' | 'checking' | 'current' | 'error'>('idle')
  const check = useCallback(async () => {
    setStatus('checking')
    try {
      const url = new URL(`${import.meta.env.BASE_URL}version.json`, document.baseURI)
      url.searchParams.set('check', `${Date.now()}-${Math.random().toString(36).slice(2)}`)
      const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(8000) })
      if (!response.ok) throw new Error('Version unavailable')
      const release: unknown = await response.json()
      if (
        !release ||
        typeof release !== 'object' ||
        !('version' in release) ||
        typeof release.version !== 'string' ||
        !('revision' in release) ||
        typeof release.revision !== 'string' ||
        !('builtAt' in release) ||
        typeof release.builtAt !== 'string' ||
        !/^[a-zA-Z0-9-]{1,80}$/.test(release.version)
      )
        throw new Error('Invalid version')
      setAvailable(release.version === APP_RELEASE.version ? null : (release as Release))
      setStatus('current')
    } catch {
      setStatus('error')
    }
  }, [])
  useEffect(() => {
    void check()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check()
    }
    document.addEventListener('visibilitychange', onVisible)
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void check()
    }, 300000)
    const onPreloadError = (event: Event) => {
      event.preventDefault()
      void check()
    }
    window.addEventListener('vite:preloadError', onPreloadError)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('vite:preloadError', onPreloadError)
      clearInterval(timer)
    }
  }, [check])
  const reload = () => {
    const url = new URL(location.href)
    url.searchParams.set('v', available?.version ?? Date.now().toString())
    location.replace(url.href)
  }
  return { available, status, check, reload }
}
