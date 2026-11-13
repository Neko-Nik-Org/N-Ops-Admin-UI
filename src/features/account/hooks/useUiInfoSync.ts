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

/** Syncs the theme choice with the account's saved UI preferences. */

import { useAtom } from 'jotai'
import { useEffect, useRef } from 'react'
import { themeAtom, type Theme } from '@/app/theme'
import { useSaveUiInfo, useUiInfo } from './useAccount'

/** Valid theme values, used to ignore anything unexpected stored in ui_info. */
const THEMES: readonly Theme[] = ['light', 'dark', 'system']
const isTheme = (value: unknown): value is Theme => THEMES.includes(value as Theme)

/**
 * Keeps the theme in step with the account's `ui_info` so it follows the user across devices:
 * the saved theme is applied once on load, and later changes are written back (merged into the rest of `ui_info`).
 */
export const useUiInfoSync = (): void => {
  const [theme, setTheme] = useAtom(themeAtom)
  const { data: uiInfo } = useUiInfo()
  const { mutate: save } = useSaveUiInfo()
  // The theme both sides agree on; null until ui_info has loaded.
  const synced = useRef<Theme | null>(null)

  useEffect(() => {
    if (!uiInfo) return

    /** First load: adopt the saved theme, if there is one. */
    if (synced.current === null) {
      if (isTheme(uiInfo.theme)) {
        synced.current = uiInfo.theme
        if (uiInfo.theme !== theme) setTheme(uiInfo.theme)
      } else {
        // Nothing saved yet — don't write until the user actually picks a theme.
        synced.current = theme
      }
      return
    }

    /** Afterwards: write back only when the user actually changed the theme. */
    if (theme === synced.current) return
    synced.current = theme
    save({ ...uiInfo, theme })
  }, [uiInfo, theme, setTheme, save])
}
