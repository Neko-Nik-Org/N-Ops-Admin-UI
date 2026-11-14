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
import { themeAtom, themeUnsyncedAtom, type Theme } from '@/app/theme'
import { useSaveUiInfo, useUiInfo } from './useAccount'

/** Valid theme values, used to ignore anything unexpected stored in ui_info. */
const THEMES: readonly Theme[] = ['light', 'dark', 'system']
const isTheme = (value: unknown): value is Theme => THEMES.includes(value as Theme)

/**
 * Keeps the theme in step with the account's `ui_info` so it follows the user across devices.
 *
 * The newest choice wins:
 * - on load, a theme picked on this device that never reached the account (e.g. on the sign-in
 *   page) is saved to the account; otherwise the account's saved theme is applied;
 * - later changes are written back, merged into the rest of `ui_info`.
 */
export const useUiInfoSync = (): void => {
  const [theme, setTheme] = useAtom(themeAtom)
  const [unsynced, setUnsynced] = useAtom(themeUnsyncedAtom)
  const { data: uiInfo } = useUiInfo()
  const { mutate: save } = useSaveUiInfo()
  // The theme both sides agree on; null until ui_info has loaded.
  const synced = useRef<Theme | null>(null)
  // Latest theme, so a slow save doesn't clear the flag for a newer, unsaved pick.
  const latest = useRef(theme)
  useEffect(() => {
    latest.current = theme
  }, [theme])

  useEffect(() => {
    if (!uiInfo) return

    /** Saves `value` to the account, then clears the "not saved yet" flag if nothing newer was picked. */
    const push = (value: Theme) =>
      save({ ...uiInfo, theme: value }, { onSuccess: () => latest.current === value && setUnsynced(false) })

    /** First load: decide which side is newer. */
    if (synced.current === null) {
      synced.current = theme
      if (unsynced) {
        // Picked on this device since the last save: the account catches up.
        if (uiInfo.theme === theme) setUnsynced(false)
        else push(theme)
      } else if (isTheme(uiInfo.theme)) {
        synced.current = uiInfo.theme
        if (uiInfo.theme !== theme) setTheme(uiInfo.theme)
      }
      // Nothing saved and nothing picked: don't write until the user actually picks a theme.
      return
    }

    /** Afterwards: write back only when the theme actually changed. */
    if (theme === synced.current) return
    synced.current = theme
    push(theme)
  }, [uiInfo, theme, unsynced, setTheme, setUnsynced, save])
}
