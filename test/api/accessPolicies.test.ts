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
/** Tests for src/api/accessPolicies.ts. */

import { describe, expect, it } from 'vitest'
import {
  countAccessPolicyUsers,
  createAccessPolicy,
  deleteAccessPolicy,
  fetchAccessPolicy,
  listAccessPolicies,
  listAccessPoliciesPage,
  POLICY_PAGE_SIZE,
  updateAccessPolicy,
} from '@/api/accessPolicies'
import { type AccessPolicy, type AccessPolicyInput } from '@/types/accessPolicy'
import { api } from '../testUtils'

const rawPolicy = {
  policy_id: 4,
  policy_name: 'Office only',
  policy_description: 'HQ network',
  enforce_totp_2fa: true,
  enforce_email_2fa: false,
  allow_device_logins: true,
  has_ip_restriction: true,
  has_geo_restriction: false,
  allowed_ips: ['203.0.113.0/24'],
  allowed_geo_locations: [],
}

const policy: AccessPolicy = {
  policyId: 4,
  policyName: 'Office only',
  policyDescription: 'HQ network',
  enforceTotp2fa: true,
  enforceEmail2fa: false,
  allowDeviceLogins: true,
  hasIpRestriction: true,
  allowedIps: ['203.0.113.0/24'],
  hasGeoRestriction: false,
  allowedGeoLocations: [],
}

const { policyId: _id, ...input } = policy
const policyInput: AccessPolicyInput = input

const rawRules = {
  enforce_totp_2fa: true,
  enforce_email_2fa: false,
  allow_device_logins: true,
  set_ip_restriction: true,
  set_geo_restriction: false,
  allowed_ips: ['203.0.113.0/24'],
  allowed_geo_locations: [],
}

describe('access policies api', () => {
  it('lists a page with the name filter, limit and offset the API takes', async () => {
    api.get.mockResolvedValue({ data: [rawPolicy] })
    await expect(listAccessPoliciesPage({ search: ' office ', limit: 10, offset: 20 })).resolves.toEqual([policy])
    expect(api.get).toHaveBeenCalledWith('/policy/access-restriction/list', {
      params: { limit: 10, offset: 20, policy_name: 'office' },
    })
  })

  it('pages through every policy', async () => {
    const full = Array.from({ length: POLICY_PAGE_SIZE }, (_, i) => ({ ...rawPolicy, policy_id: i + 1 }))
    api.get.mockResolvedValueOnce({ data: full }).mockResolvedValueOnce({ data: [] })
    await expect(listAccessPolicies()).resolves.toHaveLength(POLICY_PAGE_SIZE)
    expect(api.get).toHaveBeenLastCalledWith('/policy/access-restriction/list', {
      params: { limit: POLICY_PAGE_SIZE, offset: POLICY_PAGE_SIZE },
    })
  })

  it('fetches one policy, treating null lists as empty', async () => {
    api.get.mockResolvedValue({ data: { ...rawPolicy, allowed_geo_locations: null } })
    await expect(fetchAccessPolicy(4)).resolves.toEqual(policy)
    expect(api.get).toHaveBeenCalledWith('/policy/access-restriction/get/4')
  })

  it('creates a policy with the field names the API expects', async () => {
    api.post.mockResolvedValue({ data: undefined })
    await createAccessPolicy(policyInput)
    expect(api.post).toHaveBeenCalledWith('/policy/access-restriction/create', {
      policy_name: 'Office only',
      description: 'HQ network',
      ...rawRules,
    })
  })

  it('sends an empty list for a restriction that is switched off', async () => {
    api.post.mockResolvedValue({ data: undefined })
    await createAccessPolicy({ ...policyInput, hasIpRestriction: false })
    expect(api.post).toHaveBeenCalledWith(
      '/policy/access-restriction/create',
      expect.objectContaining({ set_ip_restriction: false, allowed_ips: [] }),
    )
  })

  it('renames through PUT only when only the info changed', async () => {
    api.put.mockResolvedValue({ data: undefined })
    await updateAccessPolicy(policy, { ...policyInput, policyName: 'HQ' })
    expect(api.put).toHaveBeenCalledWith('/policy/access-restriction/update/4', { policy_name: 'HQ', description: 'HQ network' })
    expect(api.patch).not.toHaveBeenCalled()
  })

  it('changes rules through PATCH only when only the rules changed', async () => {
    api.patch.mockResolvedValue({ data: undefined })
    await updateAccessPolicy(policy, { ...policyInput, enforceEmail2fa: true })
    expect(api.patch).toHaveBeenCalledWith('/policy/access-restriction/update/4', { ...rawRules, enforce_email_2fa: true })
    expect(api.put).not.toHaveBeenCalled()
  })

  it('sends a mobile app change through PATCH', async () => {
    api.patch.mockResolvedValue({ data: undefined })
    await updateAccessPolicy(policy, { ...policyInput, allowDeviceLogins: false })
    expect(api.patch).toHaveBeenCalledWith('/policy/access-restriction/update/4', { ...rawRules, allow_device_logins: false })
  })

  it('treats a policy from an API without the mobile app rule as allowing it', async () => {
    const { allow_device_logins: _omit, ...older } = rawPolicy
    api.get.mockResolvedValue({ data: older })
    await expect(fetchAccessPolicy(4)).resolves.toEqual(policy)
  })

  it('saves rules before the name, and stops if the rules are refused', async () => {
    api.patch.mockRejectedValue(new Error('Failed to update policy'))
    await expect(updateAccessPolicy(policy, { ...policyInput, policyName: 'HQ', enforceEmail2fa: true })).rejects.toThrow()
    expect(api.put).not.toHaveBeenCalled()
  })

  it('makes no request when nothing changed', async () => {
    await updateAccessPolicy(policy, { ...policyInput, allowedGeoLocations: ['US'] })
    expect(api.put).not.toHaveBeenCalled()
    expect(api.patch).not.toHaveBeenCalled()
  })

  it('counts the users who have a policy', async () => {
    api.get.mockResolvedValue({ data: 3 })
    await expect(countAccessPolicyUsers(4)).resolves.toBe(3)
    expect(api.get).toHaveBeenCalledWith('/policy/access-restriction/check/4')
  })

  it('deletes a policy', async () => {
    api.delete.mockResolvedValue({ data: undefined })
    await deleteAccessPolicy(4)
    expect(api.delete).toHaveBeenCalledWith('/policy/access-restriction/delete/4')
  })
})
