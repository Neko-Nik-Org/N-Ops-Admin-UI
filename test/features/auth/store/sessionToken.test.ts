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
/** Tests for src/features/auth/store/sessionToken.ts, using real (jsdom) cookies. */

import { describe, expect, it, vi } from 'vitest'
import {
  clearSessionToken,
  getSessionIssuedAt,
  getSessionToken,
  isSessionRemembered,
  setSessionToken,
} from '@/features/auth/store/sessionToken'

describe('session token store', () => {
  it('is empty when signed out', () => {
    expect(getSessionToken()).toBeUndefined()
    expect(isSessionRemembered()).toBe(false)
    expect(getSessionIssuedAt()).toBe(0)
  })

  it('stores the token and when it was issued', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
    setSessionToken('abc', false)
    expect(getSessionToken()).toBe('abc')
    expect(getSessionIssuedAt()).toBe(1_700_000_000_000)
    expect(isSessionRemembered()).toBe(false)
    vi.restoreAllMocks()
  })

  it('remembers "Keep me signed in" sessions', () => {
    setSessionToken('abc', true)
    expect(isSessionRemembered()).toBe(true)
  })

  it('drops the remember flag when a later session is not remembered', () => {
    setSessionToken('first', true)
    setSessionToken('second', false)
    expect(getSessionToken()).toBe('second')
    expect(isSessionRemembered()).toBe(false)
  })

  it('clears everything on sign-out', () => {
    setSessionToken('abc', true)
    clearSessionToken()
    expect(getSessionToken()).toBeUndefined()
    expect(isSessionRemembered()).toBe(false)
    expect(getSessionIssuedAt()).toBe(0)
  })
})
