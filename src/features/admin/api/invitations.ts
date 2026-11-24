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
/**
 * API calls for organization invitations (`/invite/*`). Sending one emails the invitee a link with a
 * one-time code; the API keeps only the code's hash, so an invitation can't be shown or re-sent, only
 * revoked and sent again.
 */

import { apiClient } from '@/lib/axios'
import type { Invitation, InvitationInput } from '../types'

const BASE = '/invite'

/** Invitation as sent by the API (`InviteInfo` in the Main API). */
interface RawInvitation {
  invitation_id: number
  email: string
  invitation_notes: string | null
  role_id: number
  access_restriction_policy_id: number | null
  invited_at: string
  expires_at: string
}

/** Maps an API invitation to the app's camelCase Invitation. */
const toInvitation = (i: RawInvitation): Invitation => ({
  invitationId: i.invitation_id,
  email: i.email,
  invitationNotes: i.invitation_notes ?? '',
  roleId: i.role_id,
  accessPolicyId: i.access_restriction_policy_id ?? null,
  invitedAt: i.invited_at,
  expiresAt: i.expires_at,
})

/** Invitations fetched per request when listing every invitation. */
export const INVITATION_PAGE_SIZE = 100

/** Options for one page of invitations. */
export interface ListInvitationsParams {
  /** Case-insensitive match on part of the email. */
  email?: string
  limit?: number
  offset?: number
}

/** `GET /invite/list` — one page of the organization's invitations. Requires `user:invite:view`. */
export const listInvitationsPage = async ({
  email,
  limit = INVITATION_PAGE_SIZE,
  offset = 0,
}: ListInvitationsParams = {}): Promise<Invitation[]> => {
  const params: Record<string, string | number> = { limit, offset }
  if (email?.trim()) params.email = email.trim()
  const { data } = await apiClient.get<RawInvitation[]>(`${BASE}/list`, { params })
  return data.map(toInvitation)
}

/** Every invitation in the organization, newest first (the API returns them unordered). */
export const listInvitations = async (): Promise<Invitation[]> => {
  const invitations: Invitation[] = []
  for (;;) {
    const page = await listInvitationsPage({ offset: invitations.length })
    invitations.push(...page)
    if (page.length < INVITATION_PAGE_SIZE) break
  }
  return invitations.sort((a, b) => Date.parse(b.invitedAt) - Date.parse(a.invitedAt))
}

/**
 * `POST /invite/new` — saves the invitation and emails it. Requires `user:invite:create` +
 * `user:create`. Responds 201 with no body; 400 when the email already has an account or an
 * invitation (in any organization), or the expiry is outside 1 hour – 21 days.
 */
export const sendInvitation = async (input: InvitationInput): Promise<void> => {
  await apiClient.post(`${BASE}/new`, {
    invite_to_email: input.email.trim().toLowerCase(),
    invitation_notes: input.invitationNotes.trim(),
    role_id: input.roleId,
    access_restriction_policy_id: input.accessPolicyId,
    expiration_datetime: input.expiresAt.toISOString(),
  })
}

/** `DELETE /invite/delete/{id}` — revokes an invitation, so its link stops working. Requires `user:invite:view` + `user:invite:delete`. */
export const deleteInvitation = async (invitationId: number): Promise<void> => {
  await apiClient.delete(`${BASE}/delete/${invitationId}`)
}
