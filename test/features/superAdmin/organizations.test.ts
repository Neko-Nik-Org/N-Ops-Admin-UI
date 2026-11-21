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
import {
  createOrganization,
  deleteOrganization,
  getOrganization,
  InvalidAdminKeyError,
  isOrganizationNameAvailable,
  listOrganizations,
  renameOrganization,
  setOrganizationActive,
  updateOrganizationLimits,
} from '@/features/superAdmin/api/organizations'
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

  const limits = {
    aiCredit: 1,
    storageBytes: 1,
    userLimit: 1,
    serverLimit: 1,
    workflowLimit: 1,
    vaultProjectLimit: 1,
    vaultKeysPerProjectLimit: 1,
    vaultNotesLimit: 1,
  }

  it('reads billing details, and checks a name exactly', async () => {
    client.get.mockResolvedValueOnce({ data: rawOrg('a-1', 'Acme', { billing_info: { plan: 'pro' } }) })
    expect((await getOrganization('k3y', 'a-1')).billingInfo).toEqual({ plan: 'pro' })
    client.get.mockResolvedValueOnce({ data: { is_available: false } })
    expect(await isOrganizationNameAvailable('k3y', 'Acme Corp')).toBe(false)
    expect(client.get).toHaveBeenLastCalledWith('/super-admin/organization/check-name/Acme%20Corp', { headers })
  })

  it('explains a taken name, which the API only reports as a database error', async () => {
    const dbError = new ApiError('SQL Database error (E112)', 417, 'E112')
    const org = { organizationName: 'Acme', organizationInfo: {}, billingInfo: {}, isActive: true, ...limits }
    client.post.mockRejectedValueOnce(dbError)
    await expect(createOrganization('k3y', org)).rejects.toThrow('That organization name is already taken. (E112)')
    client.put.mockRejectedValueOnce(dbError)
    await expect(renameOrganization('k3y', 'a-1', 'Acme')).rejects.toThrow('That organization name is already taken.')
  })

  it("explains the 404 the API gives for limits it refuses, and for an organization that's gone", async () => {
    client.put.mockRejectedValueOnce(new ApiError('Not Found', 404))
    await expect(updateOrganizationLimits('k3y', 'a-1', limits)).rejects.toThrow(/refused these limits/)
    client.put.mockRejectedValueOnce(new ApiError('Not Found', 404))
    await expect(setOrganizationActive('k3y', 'zzz', true)).rejects.toThrow("That organization doesn't exist any more.")
  })

  it('deletes with the key, treating "already gone" (226) as done', async () => {
    client.delete.mockResolvedValueOnce({ status: 226, data: '' })
    await expect(deleteOrganization('k3y', 'a-1')).resolves.toBeUndefined()
    expect(client.delete).toHaveBeenCalledWith('/super-admin/organization/delete/a-1', { headers })
  })
})
