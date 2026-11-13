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

/** Validation rules for the sign-in form. */

import * as yup from 'yup'

/** Username and password are required; the username is trimmed before submitting. */
export const loginSchema = yup.object({
  userName: yup.string().trim().required('Enter your username.'),
  password: yup.string().required('Enter your password.'),
  rememberMe: yup.boolean().default(false),
})

/** Values produced by the sign-in form after validation. */
export type LoginFormValues = yup.InferType<typeof loginSchema>
