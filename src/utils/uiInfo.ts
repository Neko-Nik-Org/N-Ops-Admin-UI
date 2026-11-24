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
 * The structure of a user's UI preferences (`/user/self/ui-info`, stored in `app_user.ui_info`).
 * The API keeps any JSON and replaces it whole on save; the app uses it to follow the user across
 * devices and sign-ins:
 *
 *   {
 *     "version": 1,
 *     "theme": "light" | "dark" | "system",
 *     "sidebar_collapsed": true,
 *     "selected_tag_id": 3,                 // null = "All tags"
 *     "vault_view": "icons" | "details",
 *     "last_location": { "path": "/vault/3/env", "at": "2026-11-20T10:15:00.000Z" }
 *   }
 *
 * Keys it doesn't know are saved back unchanged.
 */

import type { JsonObject } from '@/types/account'

export const UI_INFO_VERSION = 1

export type ThemeChoice = 'light' | 'dark' | 'system'
export type VaultView = 'icons' | 'details'

export interface UiInfo {
  theme?: ThemeChoice
  sidebarCollapsed?: boolean
  selectedTagId?: number | null
  vaultView?: VaultView
  /** The page the user was last on, to return to after signing in again. */
  lastLocation?: { path: string; at: string }
}

const OWN_KEYS = new Set(['version', 'theme', 'sidebar_collapsed', 'selected_tag_id', 'vault_view', 'last_location'])

/** Saved ui_info (any shape) → what this app understands, plus everything else to keep. */
export const parseUiInfo = (raw: JsonObject): { info: UiInfo; preserved: JsonObject } => {
  const info: UiInfo = {}
  if (raw.theme === 'light' || raw.theme === 'dark' || raw.theme === 'system') info.theme = raw.theme
  if (typeof raw.sidebar_collapsed === 'boolean') info.sidebarCollapsed = raw.sidebar_collapsed
  if (raw.selected_tag_id === null || (typeof raw.selected_tag_id === 'number' && Number.isInteger(raw.selected_tag_id)))
    info.selectedTagId = raw.selected_tag_id
  if (raw.vault_view === 'icons' || raw.vault_view === 'details') info.vaultView = raw.vault_view
  const last = raw.last_location as { path?: unknown; at?: unknown } | null | undefined
  if (last && typeof last === 'object' && typeof last.path === 'string' && typeof last.at === 'string')
    info.lastLocation = { path: last.path, at: last.at }

  const preserved: JsonObject = {}
  for (const [key, value] of Object.entries(raw)) if (!OWN_KEYS.has(key)) preserved[key] = value
  return { info, preserved }
}

/** The object to POST: kept values, the version, and every preference that is set. */
export const serializeUiInfo = (info: UiInfo, preserved: JsonObject = {}): JsonObject => {
  const out: JsonObject = { ...preserved, version: UI_INFO_VERSION }
  if (info.theme !== undefined) out.theme = info.theme
  if (info.sidebarCollapsed !== undefined) out.sidebar_collapsed = info.sidebarCollapsed
  if (info.selectedTagId !== undefined) out.selected_tag_id = info.selectedTagId
  if (info.vaultView !== undefined) out.vault_view = info.vaultView
  if (info.lastLocation) out.last_location = info.lastLocation
  return out
}

/** Pages worth returning to: in-app paths only (no sign-in, invite or super-admin pages). */
export const isRestorablePath = (path: string | undefined): path is string =>
  !!path &&
  path.length <= 500 &&
  /^\/(?![/\\])/.test(path) && // one leading slash: never another site
  !/^\/(login|invite|super-admin)(\/|$|\?)/.test(path)
