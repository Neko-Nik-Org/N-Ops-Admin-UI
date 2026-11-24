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

/** Types for accepting an invitation to join an organization. */

import type { JsonObject } from '@/types/account'

/**
 * What the emailed link carries: `/invite?code=<base64 JSON>`, where the JSON is
 * `{ email, invitation_code, invited_by, org_name }`. It's read in the browser; the API only checks
 * the code when the account is created.
 */
export interface InviteLink {
  email: string
  invitationCode: string
  invitedBy: string
  organizationName: string
}

/** What the new user fills in to create their account. */
export interface AcceptInvitePayload {
  userName: string
  displayName: string
  password: string
  /** Optional profile details (job, contact, availability …), as saved by utils/profileDetails.ts. */
  userDetails?: JsonObject
}
