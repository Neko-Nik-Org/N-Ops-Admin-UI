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
/** Which vault project and service you're looking at, remembered per browser and shared by the Vault pages. */

import { atomWithStorage } from 'jotai/utils'

/** Selected project id (localStorage `nops-vault-project`); null until one is picked. */
export const vaultProjectIdAtom = atomWithStorage<number | null>('nops-vault-project', null, undefined, { getOnInit: true })

/** Selected service id (localStorage `nops-vault-service`); null until one is picked. */
export const vaultServiceIdAtom = atomWithStorage<number | null>('nops-vault-service', null, undefined, { getOnInit: true })
