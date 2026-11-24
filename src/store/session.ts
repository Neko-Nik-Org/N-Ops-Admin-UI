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

/** In-memory session state shared across the app. */

import { atom, type SetStateAction } from 'jotai'
import type { CurrentUser } from '@/types/auth'
import { storeProfile } from './profileStorage'
import { securityRequirementsAtom } from './securityRequirements'

/** 'checking' while the saved session is being verified on load, then signed in or out. */
export type SessionStatus = 'checking' | 'authenticated' | 'unauthenticated'

/** Current session status; the route guards render from this. */
export const sessionStatusAtom = atom<SessionStatus>('checking')
/** In-memory value behind currentUserAtom. */
const currentUserValueAtom = atom<CurrentUser | null>(null)

/**
 * Profile of the signed-in user. Set on sign-in, and every change is saved to storage
 * (profileStorage.ts) so useSessionBootstrap can restore it after a page reload.
 */
export const currentUserAtom = atom(
  (get) => get(currentUserValueAtom),
  (get, set, update: SetStateAction<CurrentUser | null>) => {
    const next = typeof update === 'function' ? update(get(currentUserValueAtom)) : update
    set(currentUserValueAtom, next)
    storeProfile(next)
    // signing out drops the policy requirements of that sign-in
    if (!next) set(securityRequirementsAtom, null)
  },
)
