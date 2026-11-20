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
/** Tests for src/lib/secureStorage.ts: localStorage holds only ciphertext, and the app still reads it back. */

import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { initSecureStorage, resetSecureStorageForTests, secureStorage } from '@/lib/secureStorage'

/** Like a page reload: memory is gone, localStorage and the IndexedDB key stay. */
const reload = async () => {
  resetSecureStorageForTests()
  await initSecureStorage()
}

/** Waits for the background encryption to reach localStorage. */
const stored = (key: string) =>
  vi.waitFor(() => {
    const value = localStorage.getItem(key)
    if (!value?.startsWith('enc:v1:')) throw new Error(`${key} isn't encrypted yet`)
    return value
  })

beforeEach(reload)

describe('secureStorage', () => {
  it('keeps only ciphertext in localStorage, and reads it back after a reload', async () => {
    secureStorage.setItem('nops_profile', '{"primaryEmail":"priya@acme.dev"}')
    expect(secureStorage.getItem('nops_profile')).toBe('{"primaryEmail":"priya@acme.dev"}') // at once
    const cipher = await stored('nops_profile')
    expect(cipher).not.toContain('priya')

    await reload()
    expect(secureStorage.getItem('nops_profile')).toBe('{"primaryEmail":"priya@acme.dev"}')
  })

  it('uses a fresh IV for every write', async () => {
    secureStorage.setItem('nops-theme', '"dark"')
    const first = await stored('nops-theme')
    secureStorage.setItem('nops-theme', '"dark"')
    await vi.waitFor(() => expect(localStorage.getItem('nops-theme')).not.toBe(first))
  })

  it('encrypts values saved as plain text by older versions', async () => {
    localStorage.setItem('nops-sidebar-collapsed', 'true')
    await reload()
    expect(secureStorage.getItem('nops-sidebar-collapsed')).toBe('true')
    await stored('nops-sidebar-collapsed')
  })

  it('drops a value it cannot decrypt, and leaves other sites’ keys alone', async () => {
    localStorage.setItem('nops-selected-tag', 'enc:v1:AAAAAAAAAAAAAAAAAAAAAAAAAAAA')
    localStorage.setItem('other-app', 'plain')
    await reload()
    expect(secureStorage.getItem('nops-selected-tag')).toBeNull()
    expect(localStorage.getItem('nops-selected-tag')).toBeNull()
    expect(localStorage.getItem('other-app')).toBe('plain')
  })

  it('lets a removal win over an encryption still in flight', async () => {
    secureStorage.setItem('nops_profile', '{}')
    secureStorage.removeItem('nops_profile')
    await new Promise((r) => setTimeout(r, 50))
    expect(localStorage.getItem('nops_profile')).toBeNull()
  })

  it('passes on a change made in another tab', async () => {
    secureStorage.setItem('nops-theme', '"light"')
    const cipher = await stored('nops-theme')
    await reload() // "this tab" now holds light; pretend another tab wrote dark
    secureStorage.setItem('nops-theme', '"dark"')
    const listener = vi.fn()
    secureStorage.subscribe('nops-theme', listener)
    window.dispatchEvent(new StorageEvent('storage', { key: 'nops-theme', newValue: cipher, storageArea: localStorage }))
    await vi.waitFor(() => expect(listener).toHaveBeenCalledWith('"light"'))
    expect(secureStorage.getItem('nops-theme')).toBe('"light"')
  })
})
