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
/** Types for invitations to join the organization (`/invite/*`). */

/**
 * A pending invitation to join the organization (`organization_invitation`). It is deleted when
 * revoked, and the API's cleanup job removes it some time after it expires.
 */
export interface Invitation {
  invitationId: number
  email: string
  /** Message from the inviter, shown in the email; '' when none. */
  invitationNotes: string
  /** Role the invitee gets on joining. */
  roleId: number
  /** Access policy the invitee gets on joining; null for none. */
  accessPolicyId: number | null
  invitedAt: string
  expiresAt: string
}

/** What sending an invitation takes. */
export interface InvitationInput {
  /** Lowercase; the API refuses uppercase letters. */
  email: string
  invitationNotes: string
  roleId: number
  accessPolicyId: number | null
  /** Between 1 hour and 21 days from now (the API's limits). */
  expiresAt: Date
}
