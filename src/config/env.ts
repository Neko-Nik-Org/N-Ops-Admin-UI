
type RuntimeKey = 'API_BASE_URL' | 'TURNSTILE_SITE_KEY'

declare global {
  interface Window {
    __NOPS_ENV__?: Partial<Record<RuntimeKey, string>>
  }
}

const read = (runtimeKey: RuntimeKey, viteKey: keyof ImportMetaEnv): string => {
  const runtime = typeof window !== 'undefined' ? window.__NOPS_ENV__?.[runtimeKey] : undefined
  const value = runtime || import.meta.env[viteKey]
  if (!value) {
    throw new Error(`Missing required config: set ${runtimeKey} on the container, or ${viteKey} in .env for local dev`)
  }
  return value
}

export const env = {
  apiBaseUrl: read('API_BASE_URL', 'VITE_API_BASE_URL'),
  turnstileSiteKey: read('TURNSTILE_SITE_KEY', 'VITE_TURNSTILE_SITE_KEY'),
}
