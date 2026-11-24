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

/** Validation rules for the invite (create account) form. Username and password follow the API's rules. */

import * as yup from 'yup'
import { passwordField, usernameField } from '@/utils/validation'

export const inviteSchema = yup.object({
  displayName: yup.string().trim().required('Enter your name.').max(100, 'Keep it to 100 characters or fewer.'),
  userName: usernameField('Choose a username.'),
  password: passwordField('Create a password.'),
  confirmPassword: yup
    .string()
    .required('Type the password again.')
    .oneOf([yup.ref('password')], "The passwords don't match."),
})

/** Values produced by the invite form after validation. */
export type InviteFormValues = yup.InferType<typeof inviteSchema>
