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
 * The access-policy requirements reported at sign-in. Only sign-in reports them (not `/auth/verify`
 * or `/user/self/profile`), so they are kept, encrypted, apart from the profile: the startup profile
 * fetch replaces the profile but must not drop these. Cleared at sign-out.
 */

import { atom, type SetStateAction } from 'jotai'
import { secureStorage } from '@/utils/secureStorage'
import { isSecurityRequirements, type SecondFactor, type SecurityRequirements } from '@/utils/securitySetup'

const STORAGE_KEY = 'nops_security_requirements'

/** The stored requirements, or null when there are none (or storage is unreadable). */
export const loadSecurityRequirements = (): SecurityRequirements | null => {
  try {
    const raw = secureStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    return isSecurityRequirements(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** Saves (or, with null, removes) the requirements. */
export const storeSecurityRequirements = (value: SecurityRequirements | null): void => {
  try {
    if (value) secureStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    else secureStorage.removeItem(STORAGE_KEY)
  } catch {
    // blocked storage: the requirements last until the page reloads
  }
}

const valueAtom = atom<SecurityRequirements | null | undefined>(undefined)

/** The signed-in user's policy requirements; every write is saved too. Read lazily from storage. */
export const securityRequirementsAtom = atom(
  (get) => {
    const value = get(valueAtom)
    return value === undefined ? loadSecurityRequirements() : value
  },
  (get, set, update: SetStateAction<SecurityRequirements | null>) => {
    const current = get(valueAtom)
    const prev = current === undefined ? loadSecurityRequirements() : current
    const next = typeof update === 'function' ? update(prev) : update
    set(valueAtom, next)
    storeSecurityRequirements(next)
  },
)

/** Records that the user turned `factor` on, so its setup step is done. */
export const markFactorEnabledAtom = atom(null, (_get, set, factor: SecondFactor) =>
  set(securityRequirementsAtom, (r) => (r && !r.enabled.includes(factor) ? { ...r, enabled: [...r.enabled, factor] } : r)),
)
