import { afterEach, describe, expect, it, vi } from 'vitest'

// env.ts reads its config once at import, so each case sets things up and re-imports it fresh
const load = async () => {
  vi.resetModules()
  return (await import('@/config/env')).env
}

afterEach(() => {
  delete window.__NOPS_ENV__
  vi.unstubAllEnvs()
})

describe('env config', () => {
  it('prefers the runtime values written by the container', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://build-time.example')
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'build-key')
    window.__NOPS_ENV__ = { API_BASE_URL: 'https://runtime.example', TURNSTILE_SITE_KEY: 'runtime-key' }
    const env = await load()
    expect(env.apiBaseUrl).toBe('https://runtime.example')
    expect(env.turnstileSiteKey).toBe('runtime-key')
  })

  it('falls back to VITE_* for local dev (empty runtime config)', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://build-time.example')
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'build-key')
    window.__NOPS_ENV__ = {}
    const env = await load()
    expect(env.apiBaseUrl).toBe('https://build-time.example')
    expect(env.turnstileSiteKey).toBe('build-key')
  })

  it('names the missing setting when neither source has it', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'build-key')
    await expect(load()).rejects.toThrow(/API_BASE_URL/)
  })
})
