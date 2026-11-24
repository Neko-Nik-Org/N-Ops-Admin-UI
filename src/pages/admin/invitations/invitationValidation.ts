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
/** Validation and expiry choices for the send-invitation form. */

import * as yup from 'yup'

/** Expiry choices for an invitation, in hours. The API allows 1 hour to 21 days. */
export const INVITATION_EXPIRY_HOURS = [1, 24, 72, 168, 336, 504] as const

const HOUR_MS = 3_600_000

/**
 * The API refuses an expiry more than 21 days minus 10 minutes away, so the longest choice is kept a
 * few minutes inside that.
 */
const MAX_INVITATION_EXPIRY_MS = 21 * 24 * HOUR_MS - 15 * 60_000

/** When an invitation sent at `now` with an expiry choice of `hours` expires. */
export const invitationExpiry = (hours: number, now = Date.now()) =>
  new Date(now + Math.min(hours * HOUR_MS, MAX_INVITATION_EXPIRY_MS))

/** Send-invitation form. The API refuses uppercase emails, so the email is lowercased on send. */
export const invitationSchema = yup.object({
  email: yup
    .string()
    .trim()
    .required('Enter their email.')
    .email('Enter a valid email address.')
    .max(254, 'Keep it to 254 characters or fewer.'),
  roleId: yup.number().typeError('Pick a role.').required('Pick a role.').min(1, 'Pick a role.'),
  /** 0 = no access policy. */
  accessPolicyId: yup.number().default(0),
  expiresInHours: yup
    .number()
    .required()
    .oneOf([...INVITATION_EXPIRY_HOURS], 'Pick when the invitation expires.'),
  invitationNotes: yup.string().trim().default('').max(1000, 'Keep it to 1000 characters or fewer.'),
})

export type InvitationFormValues = yup.InferType<typeof invitationSchema>
