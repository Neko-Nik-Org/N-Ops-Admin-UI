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
/** Tests for src/features/account/api/account.ts. */

import { describe, expect, it } from 'vitest'
import {
  getOrgInfo,
  getUiInfo,
  getUserDetails,
  isJsonObject,
  saveUiInfo,
  saveUserDetails,
} from '@/features/account/api/account'
import { api } from '../../../testUtils'

describe('isJsonObject', () => {
  it('accepts plain objects only', () => {
    expect(isJsonObject({ a: 1 })).toBe(true)
    expect(isJsonObject([])).toBe(false)
    expect(isJsonObject(null)).toBe(false)
    expect(isJsonObject('x')).toBe(false)
  })
})

describe('ui-info and details', () => {
  it('reads and saves UI preferences', async () => {
    api.get.mockResolvedValue({ data: { theme: 'light' } })
    await expect(getUiInfo()).resolves.toEqual({ theme: 'light' })
    expect(api.get).toHaveBeenCalledWith('/user/self/ui-info')

    api.post.mockResolvedValue({ data: {} })
    await saveUiInfo({ theme: 'dark' })
    expect(api.post).toHaveBeenCalledWith('/user/self/ui-info', { theme: 'dark' })
  })

  it.each([null, [], 'text', 42])('treats a non-object response (%j) as empty', async (data) => {
    api.get.mockResolvedValue({ data })
    await expect(getUiInfo()).resolves.toEqual({})
    await expect(getUserDetails()).resolves.toEqual({})
  })

  it('reads and saves profile details', async () => {
    api.get.mockResolvedValue({ data: { team: 'SRE' } })
    await expect(getUserDetails()).resolves.toEqual({ team: 'SRE' })
    expect(api.get).toHaveBeenCalledWith('/user/self/details')

    api.post.mockResolvedValue({ data: {} })
    await saveUserDetails({ team: 'Platform' })
    expect(api.post).toHaveBeenCalledWith('/user/self/details', { team: 'Platform' })
  })
})

describe('getOrgInfo', () => {
  it('maps the API response to OrgInfo', async () => {
    api.get.mockResolvedValue({
      data: {
        organization_id: 'org-1',
        organization_name: 'Acme',
        organization_info: { region: 'eu' },
        allocated_ai_credit: 100,
        utilized_ai_credit: 25,
        allocated_storage_bytes: 2048,
        utilized_storage_bytes: 1024,
        user_limit: 10,
        current_user_count: 4,
        server_limit: 50,
        workflow_limit: 20,
        ss_project_limit: 5,
        current_ss_project_count: 2,
        ss_keys_limit: 100,
        ss_notes_limit: 30,
        created_at: '2026-01-02T00:00:00Z',
      },
    })

    await expect(getOrgInfo()).resolves.toEqual({
      organizationId: 'org-1',
      organizationName: 'Acme',
      organizationInfo: { region: 'eu' },
      createdAt: '2026-01-02T00:00:00Z',
      aiCredit: { used: 25, allocated: 100 },
      storageBytes: { used: 1024, allocated: 2048 },
      users: { current: 4, limit: 10 },
      vaultProjects: { current: 2, limit: 5 },
      serverLimit: 50,
      workflowLimit: 20,
      vaultKeysPerProjectLimit: 100,
      vaultNotesPerProjectLimit: 30,
    })
    expect(api.get).toHaveBeenCalledWith('/user/self/org-info')
  })
})
