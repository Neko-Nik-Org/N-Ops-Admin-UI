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
 * Typed access to runtime configuration.
 *
 * Values come from `window.__NOPS_ENV__` (written into dist/env.js when the Docker
 * container starts, see docker/write-env.mjs) and fall back to the `VITE_*` build-time
 * variables used in local development.
 */

/** Keys the container writes into env.js. */
type RuntimeKey = 'API_BASE_URL' | 'TURNSTILE_SITE_KEY'

declare global {
  interface Window {
    __NOPS_ENV__?: Partial<Record<RuntimeKey, string>>
  }
}

/**
 * Reads one setting, preferring the runtime value over the build-time one.
 * Throws on startup if neither is set, so a misconfigured deployment fails loudly.
 */
const read = (runtimeKey: RuntimeKey, viteKey: keyof ImportMetaEnv): string => {
  const runtime = typeof window !== 'undefined' ? window.__NOPS_ENV__?.[runtimeKey] : undefined
  const value = runtime || import.meta.env[viteKey]
  if (!value) {
    throw new Error(`Missing required config: set ${runtimeKey} on the container, or ${viteKey} in .env for local dev`)
  }
  return value
}

/** Resolved application configuration. */
export const env = {
  /** N-Ops Main API base URL, without a trailing slash. */
  apiBaseUrl: read('API_BASE_URL', 'VITE_API_BASE_URL'),
  /** Cloudflare Turnstile site key used by the login form. */
  turnstileSiteKey: read('TURNSTILE_SITE_KEY', 'VITE_TURNSTILE_SITE_KEY'),
}
