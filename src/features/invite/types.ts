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

/** Preview shown before accepting: who invited the user, where, and with what access. */
/** Types for the invite flow. */

export interface InviteDetails {
  inviterName: string
  organizationName: string
  role: string
  tags: string[]
  email: string
}

/** What the new user fills in to create their account. */
export interface AcceptInvitePayload {
  fullName: string
  password: string
}
