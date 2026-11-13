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

/** Theme state: the user's choice (light / dark / system) and the theme actually applied. */

import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

/** Theme the user picked in the ThemeToggle; 'system' follows the OS setting. */
export type Theme = 'light' | 'dark' | 'system'

/** Selected theme, persisted to localStorage under `nops-theme`. */
export const themeAtom = atomWithStorage<Theme>('nops-theme', 'system')

/** Tracks the OS `prefers-color-scheme` setting; subscribes to changes while mounted. */
const systemPrefersLightAtom = atom(false)
systemPrefersLightAtom.onMount = (setAtom) => {
  const mql = window.matchMedia('(prefers-color-scheme: light)')
  setAtom(mql.matches)
  const listener = (event: MediaQueryListEvent) => setAtom(event.matches)
  mql.addEventListener('change', listener)
  return () => mql.removeEventListener('change', listener)
}

/** The concrete theme to render: the user's choice, or the OS preference when set to 'system'. */
export const resolvedThemeAtom = atom((get) => {
  const theme = get(themeAtom)
  if (theme !== 'system') return theme
  return get(systemPrefersLightAtom) ? 'light' : 'dark'
})
