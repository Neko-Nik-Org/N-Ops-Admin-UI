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
/** Tests for src/features/superAdmin/api/organizations.ts. */

import { describe, expect, it, vi } from 'vitest'
import { getOrganization, InvalidAdminKeyError, listOrganizations } from '@/features/superAdmin/api/organizations'
import { superAdminClient } from '@/lib/axios'
import { ApiError } from '@/types/api'
import { rawOrg } from '../../pages/superAdmin/fixtures'

const client = vi.mocked(superAdminClient)
const headers = { 'x-nops-admin-key': 'k3y' }

describe('super-admin organizations', () => {
  it('pages through every organization, sending the admin key', async () => {
    const page = Array.from({ length: 100 }, (_, i) => rawOrg(`org-${i}`, `Org ${i}`))
    client.get.mockResolvedValueOnce({ data: page }).mockResolvedValueOnce({ data: [rawOrg('last', 'Last')] })
    const orgs = await listOrganizations('k3y')
    expect(orgs).toHaveLength(101)
    expect(client.get).toHaveBeenNthCalledWith(2, '/super-admin/organization/list', {
      params: { limit: 100, offset: 100 },
      headers,
    })
    expect(orgs[100]).toMatchObject({
      organizationId: 'last',
      storageBytes: { used: 1_073_741_824, allocated: 10_737_418_240 },
      vaultProjectLimit: 10,
    })
  })

  it('turns a 401 into InvalidAdminKeyError', async () => {
    client.get.mockRejectedValueOnce(new ApiError('Unauthorized: Missing or Invalid Admin Key', 401))
    await expect(listOrganizations('nope')).rejects.toBeInstanceOf(InvalidAdminKeyError)
  })

  it('fetches one organization, and explains the API null for an unknown id', async () => {
    client.get.mockResolvedValueOnce({ data: rawOrg('a-1', 'Acme') })
    expect(await getOrganization('k3y', 'a-1')).toMatchObject({ organizationName: 'Acme', isActive: true })
    expect(client.get).toHaveBeenCalledWith('/super-admin/organization/get/a-1', { headers })
    client.get.mockResolvedValueOnce({ data: null })
    await expect(getOrganization('k3y', 'zzz')).rejects.toThrow("There's no organization with that id.")
  })
})
