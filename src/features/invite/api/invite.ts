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

/** Accepting an invitation to join an organization (`POST /invite/join/{code}`). */

import { apiClient } from '@/lib/axios'
import { ApiError, errorCode } from '@/types/api'
import { toBase64 } from '@/utils/base64'
import type { AcceptInvitePayload, InviteLink } from '../types'

/** Decodes base64 (standard or URL-safe, padding optional) to a UTF-8 string. */
const fromBase64 = (value: string): string => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

/**
 * Reads the `code` query parameter of an invitation link. The API doesn't URL-encode it, so a `+` in
 * the base64 arrives as a space, which is put back. Null when it isn't a readable invitation.
 */
export const parseInviteCode = (code: string | null | undefined): InviteLink | null => {
  if (!code) return null
  try {
    const raw: unknown = JSON.parse(fromBase64(code.trim().replace(/ /g, '+')))
    if (!raw || typeof raw !== 'object') return null
    const r = raw as Record<string, unknown>
    const link: InviteLink = {
      email: text(r.email),
      invitationCode: text(r.invitation_code),
      invitedBy: text(r.invited_by),
      organizationName: text(r.org_name),
    }
    return link.invitationCode && link.email ? link : null
  } catch {
    return null
  }
}

/**
 * `POST /invite/join/{code}` (no session needed) — creates the account in the inviting organization,
 * with the role and access policy the invitation was sent with, then deletes the invitation. Answers
 * 200 with no body: the new user signs in afterwards.
 *
 * The body is the API's full create-user shape, but it ignores the email, role, policy and active
 * flag and takes them from the invitation, so those are only placeholders.
 */
export const joinInvite = async (link: InviteLink, payload: AcceptInvitePayload): Promise<void> => {
  try {
    await apiClient.post(`/invite/join/${encodeURIComponent(link.invitationCode)}`, {
      user_name: payload.userName.trim(),
      display_name: payload.displayName.trim(),
      primary_email: link.email,
      user_details: {},
      is_active: true,
      role_id: 0,
      password: toBase64(payload.password),
      access_restriction_policy_id: null,
    })
  } catch (error) {
    // a taken username and a full plan both come back as a bare database error
    if (errorCode(error) === 'E112')
      throw new ApiError(
        "Couldn't create your account. That username may be taken. Try another one, or ask your admin if it keeps failing. (E112)",
        (error as ApiError).status,
        'E112',
      )
    if (error instanceof ApiError && /invalid or expired/i.test(error.message))
      throw new ApiError(
        'This invitation has expired or was already used. Ask whoever invited you to send a new one.',
        error.status,
        errorCode(error),
      )
    throw error
  }
}
