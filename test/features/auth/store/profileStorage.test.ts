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

/** Tests for src/features/auth/store/profileStorage.ts and its wiring into the session store. */

import { createStore } from 'jotai'
import { describe, expect, it } from 'vitest'
import { secureStorage } from '@/lib/secureStorage'
import { loadStoredProfile, storeProfile } from '@/features/auth/store/profileStorage'
import { currentUserAtom } from '@/features/auth/store/session'
import { clearSessionToken, setSessionToken } from '@/features/auth/store/sessionToken'
import { makeUser } from '../../../testUtils'

describe('profileStorage', () => {
  it('saves and loads a profile', () => {
    storeProfile(makeUser({ userName: 'priya' }))
    expect(loadStoredProfile()).toEqual(makeUser({ userName: 'priya' }))
  })

  it.each(['not json', '{"userName":"x"}', 'null', '[]'])('ignores bad stored data: %s', (raw) => {
    secureStorage.setItem('nops_profile', raw)
    expect(loadStoredProfile()).toBeNull()
  })

  it('every change to the current user is saved, and clearing it removes the profile', () => {
    const store = createStore()
    store.set(currentUserAtom, makeUser({ isEmailVerified: false }))
    store.set(currentUserAtom, (user) => (user ? { ...user, isEmailVerified: true } : user))
    expect(loadStoredProfile()?.isEmailVerified).toBe(true)
    store.set(currentUserAtom, null)
    expect(loadStoredProfile()).toBeNull()
  })

  it('is removed with the session token (sign-out, 401)', () => {
    setSessionToken('s1', true)
    storeProfile(makeUser())
    clearSessionToken()
    expect(loadStoredProfile()).toBeNull()
  })

  it('keeps the role scope from the full profile', () => {
    const user = makeUser({ allowedLinuxUsers: ['deploy'], canApproveApprovals: true, canBypassApprovals: false })
    storeProfile(user)
    expect(loadStoredProfile()).toEqual(user)
  })

  it('ignores a saved profile whose scope fields have the wrong type', () => {
    secureStorage.setItem('nops_profile', JSON.stringify({ ...makeUser(), allowedLinuxUsers: 'deploy' }))
    expect(loadStoredProfile()).toBeNull()
  })
})
