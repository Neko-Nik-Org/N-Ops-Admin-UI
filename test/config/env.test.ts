/*
 * Copyright (C) 2026 Neko Nik <nikhil@nekonik.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * version 3 along with this program. If not, see
 * <https://www.gnu.org/licenses/>.
 */

/**
 * Tests for src/config/env.ts: runtime config wins over build-time config,
 * and a missing setting fails with a clear message.
 */

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
