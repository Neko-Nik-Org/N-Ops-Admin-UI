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
/** How the Vault explorer lists a folder's contents, remembered per browser. */

import { atomWithStorage } from 'jotai/utils'
import { secureJSONStorage } from '@/lib/secureStorage'

export type ExplorerView = 'icons' | 'details'

/** "Large icons" (the default, like Explorer) or "Details" (a table with columns). */
export const explorerViewAtom = atomWithStorage<ExplorerView>('nops-vault-view', 'icons', secureJSONStorage<ExplorerView>(), {
  getOnInit: true,
})
