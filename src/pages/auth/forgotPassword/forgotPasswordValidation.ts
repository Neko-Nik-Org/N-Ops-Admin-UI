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
/** Validation rules for the forgot-password form. */

import * as yup from 'yup'

/** The account's email, trimmed. */
export const forgotPasswordSchema = yup.object({
  email: yup.string().trim().required('Enter your email address.').email('Enter a valid email address.'),
})

/** Values produced by the forgot-password form after validation. */
export type ForgotPasswordFormValues = yup.InferType<typeof forgotPasswordSchema>
