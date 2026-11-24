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
/** Tests for src/api/account.ts. */

import { describe, expect, it } from 'vitest'
import {
  changePassword,
  changeUsername,
  deactivateAccount,
  getOrgInfo,
  getProfile,
  InactiveAccountError,
  getUiInfo,
  getUserDetails,
  isJsonObject,
  isUsernameAvailable,
  saveUiInfo,
  saveUserDetails,
  updateProfile,
  sendEmailVerification,
  verifyEmailCode,
} from '@/api/account'
import { api } from '../testUtils'

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

/** The options the API needs for routes that take a bare JSON string body. */
const JSON_BODY = { headers: { 'Content-Type': 'application/json' } }

describe('email verification', () => {
  it('asks the API to send a code', async () => {
    api.post.mockResolvedValue({ status: 201, data: '' })
    await sendEmailVerification()
    expect(api.post).toHaveBeenCalledWith('/user/self/verify-email/send')
  })

  it('sends the code as a JSON string', async () => {
    api.post.mockResolvedValue({ data: 'Email verified successfully' })
    await verifyEmailCode('1234567')
    expect(api.post).toHaveBeenCalledWith('/user/self/verify-email/validate', '"1234567"', JSON_BODY)
  })
})

describe('isUsernameAvailable', () => {
  it.each([
    [200, true],
    [409, false],
  ])('maps status %i to %s', async (status, available) => {
    api.get.mockResolvedValue({ status, data: '' })
    await expect(isUsernameAvailable('new_name')).resolves.toBe(available)
  })

  it('treats 409 as an answer, not an error, and URL-encodes the name', async () => {
    api.get.mockResolvedValue({ status: 200, data: '' })
    await isUsernameAvailable('a b/c')
    const [url, config] = api.get.mock.calls[0] as [string, { validateStatus: (s: number) => boolean }]
    expect(url).toBe('/user/self/user-name/check/a%20b%2Fc')
    expect(config.validateStatus(409)).toBe(true)
    expect(config.validateStatus(200)).toBe(true)
    expect(config.validateStatus(500)).toBe(false)
  })
})

describe('self-service changes', () => {
  it('changes the username', async () => {
    api.post.mockResolvedValue({ data: '' })
    await changeUsername('new_name')
    expect(api.post).toHaveBeenCalledWith('/user/self/change-username', '"new_name"', JSON_BODY)
  })

  it('sends the new password base64-encoded (UTF-8 safe)', async () => {
    api.post.mockResolvedValue({ data: '' })
    await changePassword('Pässw0rd!')
    const body = JSON.parse(api.post.mock.calls[0][1] as string) as string
    expect(new TextDecoder().decode(Uint8Array.from(atob(body), (c) => c.charCodeAt(0)))).toBe('Pässw0rd!')
    expect(api.post).toHaveBeenCalledWith('/user/self/change-password', expect.any(String), JSON_BODY)
  })

  it('deactivates the account', async () => {
    api.delete.mockResolvedValue({ data: '' })
    await deactivateAccount()
    expect(api.delete).toHaveBeenCalledWith('/user/self/deactivate')
  })
})

describe('getProfile', () => {
  const raw = {
    user_id: 4,
    organization_id: 'org-1',
    user_name: 'priya',
    display_name: 'Priya Rao',
    organization_name: 'Acme',
    primary_email: 'priya@acme.dev',
    is_email_verified: false,
    is_user_active: true,
    is_organization_active: true,
    permissions: ['user:role:view'],
    tags: [1, 3],
    allowed_linux_users: ['deploy'],
    can_approve_approvals: false,
    can_bypass_approvals: true,
  }

  it('maps GET /user/self/profile to the current user, with the role scope', async () => {
    api.get.mockResolvedValue({ data: raw })
    await expect(getProfile()).resolves.toEqual({
      userId: 4,
      organizationId: 'org-1',
      userName: 'priya',
      displayName: 'Priya Rao',
      organizationName: 'Acme',
      primaryEmail: 'priya@acme.dev',
      isEmailVerified: false,
      permissions: ['user:role:view'],
      tags: [1, 3],
      allowedLinuxUsers: ['deploy'],
      canApproveApprovals: false,
      canBypassApprovals: true,
    })
    expect(api.get).toHaveBeenCalledWith('/user/self/profile')
  })

  it('rejects with 404 when the API finds no user (null body)', async () => {
    api.get.mockResolvedValue({ data: null })
    await expect(getProfile()).rejects.toMatchObject({ status: 404 })
  })

  it('rejects with InactiveAccountError for a deactivated user or organization', async () => {
    api.get.mockResolvedValue({ data: { ...raw, is_user_active: false } })
    await expect(getProfile()).rejects.toMatchObject({ name: 'InactiveAccountError', reason: 'user' })
    api.get.mockResolvedValue({ data: { ...raw, is_organization_active: false } })
    const error = await getProfile().catch((e: unknown) => e)
    expect(error).toBeInstanceOf(InactiveAccountError)
    expect(error).toMatchObject({ reason: 'organization' })
  })

  it('rejects a malformed body instead of storing a broken profile', async () => {
    api.get.mockResolvedValue({ data: {} })
    await expect(getProfile()).rejects.toThrow('unexpected profile')
  })
})

describe('updateProfile', () => {
  it('sends only the display name when the email is not given', async () => {
    api.put.mockResolvedValue({ data: 'Profile updated successfully' })
    await updateProfile({ displayName: 'Priya R' })
    expect(api.put).toHaveBeenCalledWith('/user/self/profile', { display_name: 'Priya R' })
  })

  it('sends a new email when given', async () => {
    api.put.mockResolvedValue({ data: 'Profile updated successfully' })
    await updateProfile({ displayName: 'Priya R', primaryEmail: 'p@new.dev' })
    expect(api.put).toHaveBeenCalledWith('/user/self/profile', { display_name: 'Priya R', primary_email: 'p@new.dev' })
  })
})
