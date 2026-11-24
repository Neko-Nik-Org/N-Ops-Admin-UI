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
/** Tests for src/api/invite.ts: reading the emailed link and joining. */

import { describe, expect, it } from 'vitest'
import { joinInvite, parseInviteCode } from '@/api/invite'
import { ApiError } from '@/types/api'
import { api } from '../testUtils'

/** The example link from the Main API's invite email. */
const EMAILED =
  'eyJlbWFpbCI6ImFsZW5mcmFuazMwQGdtYWlsLmNvbSIsImludml0YXRpb25fY29kZSI6IjZyYTJ5UjltRyIsImludml0ZWRfYnkiOiJBbGVuIiwib3JnX25hbWUiOiJOZWtvIE5payJ9'

const encode = (value: unknown) => btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value))))

const link = { email: 'new@acme.dev', invitationCode: '6ra2yR9mG', invitedBy: 'Alen', organizationName: 'Acme' }

describe('parseInviteCode', () => {
  it('reads the link the API emails', () => {
    expect(parseInviteCode(EMAILED)).toEqual({
      email: 'alenfrank30@gmail.com',
      invitationCode: '6ra2yR9mG',
      invitedBy: 'Alen',
      organizationName: 'Neko Nik',
    })
  })

  it('handles unicode, and a + that arrived as a space', () => {
    const code = encode({ email: 'a@b.co', invitation_code: 'x', invited_by: 'Zoë ✓', org_name: 'Ünïcode >>>' })
    expect(code).toContain('+')
    expect(parseInviteCode(code.replace(/\+/g, ' '))).toMatchObject({ invitedBy: 'Zoë ✓', organizationName: 'Ünïcode >>>' })
  })

  it('rejects anything that is not a whole invitation', () => {
    expect(parseInviteCode(null)).toBeNull()
    expect(parseInviteCode('')).toBeNull()
    expect(parseInviteCode('not base64!')).toBeNull()
    expect(parseInviteCode(btoa('not json'))).toBeNull()
    expect(parseInviteCode(encode({ email: 'a@b.co' }))).toBeNull()
    expect(parseInviteCode(encode({ invitation_code: 'x' }))).toBeNull()
    expect(parseInviteCode(encode(['x']))).toBeNull()
  })
})

describe('joinInvite', () => {
  it('posts the new account to /invite/join/{code} with a base64 password', async () => {
    api.post.mockResolvedValue({ data: '' })
    await joinInvite(link, { userName: ' priya ', displayName: ' Priya Rao ', password: 'Start#Pass1' })
    expect(api.post).toHaveBeenCalledWith('/invite/join/6ra2yR9mG', {
      user_name: 'priya',
      display_name: 'Priya Rao',
      primary_email: 'new@acme.dev',
      user_details: {},
      is_active: true,
      role_id: 0,
      password: btoa('Start#Pass1'),
      access_restriction_policy_id: null,
    })
  })

  it('keeps a crafted code inside /invite/join/', async () => {
    api.post.mockResolvedValue({ data: '' })
    await joinInvite({ ...link, invitationCode: '../../tag/delete/5?' }, { userName: 'a', displayName: 'A', password: 'x' })
    expect(api.post).toHaveBeenCalledWith('/invite/join/..%2F..%2Ftag%2Fdelete%2F5%3F', expect.anything())
  })

  it('explains an expired or used invitation and a taken username', async () => {
    api.post.mockRejectedValueOnce(new ApiError('Invalid or expired invitation code.', 400))
    await expect(joinInvite(link, { userName: 'a', displayName: 'A', password: 'x' })).rejects.toThrow(
      'This invitation has expired or was already used.',
    )
    api.post.mockRejectedValueOnce(new ApiError('SQL Database error (E112)', 417, 'E112'))
    await expect(joinInvite(link, { userName: 'a', displayName: 'A', password: 'x' })).rejects.toThrow(
      'That username may be taken.',
    )
  })
})
