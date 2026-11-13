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
 * Global test setup (runs before every test file, see vite.config.ts).
 *
 * - jest-dom matchers (toBeInTheDocument, ...)
 * - runtime config, so src/config/env.ts can load
 * - small stand-ins for browser APIs jsdom lacks (<dialog> modals, matchMedia, ResizeObserver)
 * - a mocked API client: every test controls responses via `api.get/post/put/delete` (see testUtils.tsx)
 * - a clean slate after each test: DOM, cookies, localStorage and mocks
 */

import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

window.__NOPS_ENV__ = { API_BASE_URL: 'https://api.test', TURNSTILE_SITE_KEY: 'test-site-key' }

// Every test talks to this fake instead of the network. lib/axios.ts itself is tested with vi.importActual.
vi.mock('@/lib/axios', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

// jsdom has no modal dialogs: emulate the open/close state the Dialog component relies on
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}

// theme.ts subscribes to the OS color scheme; tests always report "dark"
window.matchMedia ??= (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList

// Recharts' ResponsiveContainer measures its parent
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

afterEach(() => {
  cleanup()
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0].trim()
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
  }
  localStorage.clear()
  delete window.turnstile
  vi.clearAllMocks()
})
