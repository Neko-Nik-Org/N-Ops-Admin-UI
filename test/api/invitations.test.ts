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
/** Tests for src/api/invitations.ts. */

import { describe, expect, it } from 'vitest'
import { deleteInvitation, INVITATION_PAGE_SIZE, listInvitations, listInvitationsPage, sendInvitation } from '@/api/invitations'
import { invitationExpiry } from '@/pages/admin/invitations/form/invitationValidation'
import { api } from '../testUtils'

const rawInvitation = (id: number, invitedAt = '2026-11-20T08:00:00Z', extra: Record<string, unknown> = {}) => ({
  invitation_id: id,
  email: `user${id}@example.com`,
  invitation_notes: 'Welcome aboard',
  role_id: 2,
  access_restriction_policy_id: 4,
  invited_at: invitedAt,
  expires_at: '2026-11-27T08:00:00Z',
  ...extra,
})

describe('invitations api', () => {
  it('lists a page with the email filter, limit and offset the API takes', async () => {
    api.get.mockResolvedValue({ data: [rawInvitation(1)] })
    await expect(listInvitationsPage({ email: ' user ', limit: 10, offset: 20 })).resolves.toEqual([
      {
        invitationId: 1,
        email: 'user1@example.com',
        invitationNotes: 'Welcome aboard',
        roleId: 2,
        accessPolicyId: 4,
        invitedAt: '2026-11-20T08:00:00Z',
        expiresAt: '2026-11-27T08:00:00Z',
      },
    ])
    expect(api.get).toHaveBeenCalledWith('/invite/list', { params: { limit: 10, offset: 20, email: 'user' } })
  })

  it('maps a missing policy and note to null and empty', async () => {
    api.get.mockResolvedValue({
      data: [rawInvitation(1, undefined, { access_restriction_policy_id: null, invitation_notes: null })],
    })
    const [invitation] = await listInvitationsPage()
    expect(invitation.accessPolicyId).toBeNull()
    expect(invitation.invitationNotes).toBe('')
  })

  it('pages through every invitation and puts the newest first', async () => {
    const full = Array.from({ length: INVITATION_PAGE_SIZE }, (_, i) => rawInvitation(i + 1, '2026-11-20T08:00:00Z'))
    api.get.mockResolvedValueOnce({ data: full }).mockResolvedValueOnce({ data: [rawInvitation(999, '2026-11-22T08:00:00Z')] })
    const all = await listInvitations()
    expect(all).toHaveLength(INVITATION_PAGE_SIZE + 1)
    expect(all[0].invitationId).toBe(999)
    expect(api.get).toHaveBeenLastCalledWith('/invite/list', {
      params: { limit: INVITATION_PAGE_SIZE, offset: INVITATION_PAGE_SIZE },
    })
  })

  it('sends an invitation with a lowercase email and an ISO expiry', async () => {
    api.post.mockResolvedValue({ data: undefined })
    const expiresAt = new Date('2026-11-30T10:00:00Z')
    await sendInvitation({ email: ' Priya@Company.com ', invitationNotes: ' Hi ', roleId: 3, accessPolicyId: null, expiresAt })
    expect(api.post).toHaveBeenCalledWith('/invite/new', {
      invite_to_email: 'priya@company.com',
      invitation_notes: 'Hi',
      role_id: 3,
      access_restriction_policy_id: null,
      expiration_datetime: '2026-11-30T10:00:00.000Z',
    })
  })

  it('revokes an invitation', async () => {
    api.delete.mockResolvedValue({ data: undefined })
    await deleteInvitation(7)
    expect(api.delete).toHaveBeenCalledWith('/invite/delete/7')
  })
})

describe('invitationExpiry', () => {
  const now = Date.parse('2026-11-23T00:00:00Z')

  it('adds the chosen hours', () => {
    expect(invitationExpiry(24, now).toISOString()).toBe('2026-11-24T00:00:00.000Z')
  })

  it('keeps the longest choice inside the API’s 21-days-minus-10-minutes limit', () => {
    const limit = now + 21 * 24 * 3_600_000 - 10 * 60_000
    expect(invitationExpiry(504, now).getTime()).toBeLessThan(limit)
  })
})
