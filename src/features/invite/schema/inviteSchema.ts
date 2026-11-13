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

/** Validation rules for the invite (create account) form. */

import * as yup from 'yup'

/** A full name and a password of at least 8 characters are required. */
export const inviteSchema = yup.object({
  fullName: yup.string().trim().required('Enter your full name.'),
  password: yup.string().trim().min(8, 'Use at least 8 characters.').required('Create a password.'),
})

/** Values produced by the invite form after validation. */
export type InviteFormValues = yup.InferType<typeof inviteSchema>
