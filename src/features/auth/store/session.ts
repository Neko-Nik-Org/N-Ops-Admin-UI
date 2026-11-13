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

import { atom } from 'jotai'
import type { CurrentUser } from '../types'

/** 'checking' while the saved session is being verified on load, then signed in or out. */
export type SessionStatus = 'checking' | 'authenticated' | 'unauthenticated'

/** Current session status; the route guards render from this. */
export const sessionStatusAtom = atom<SessionStatus>('checking')
/**
 * Profile of the signed-in user. Only known after a fresh sign-in: it stays null
 * after a page reload, even though the session itself is valid.
 */
export const currentUserAtom = atom<CurrentUser | null>(null)
