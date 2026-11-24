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
/** Validation for the Users pages' forms: add user, edit user, rename, reset password. */

import * as yup from 'yup'
import { passwordField, profileDetailsSchema, usernameField } from '@/utils/validation'

/** Add-user form. Username and password follow the API's rules. */
export const userSchema = yup.object({
  userName: usernameField('Enter a username.'),
  displayName: yup.string().trim().required('Enter their name.').max(100, 'Keep it to 100 characters or fewer.'),
  primaryEmail: yup
    .string()
    .trim()
    .required('Enter their email.')
    .email('Enter a valid email address.')
    .max(254, 'Keep it to 254 characters or fewer.'),
  roleId: yup.number().typeError('Pick a role.').required('Pick a role.').min(1, 'Pick a role.'),
  password: passwordField('Enter a password.'),
  confirmPassword: yup
    .string()
    .required('Type the password again.')
    .oneOf([yup.ref('password')], "The passwords don't match."),
  isActive: yup.boolean().default(true),
  /** 0 = no access policy. */
  accessPolicyId: yup.number().default(0),
  /** Optional profile details, as the profile details form holds them. */
  details: profileDetailsSchema,
})

export type UserFormValues = yup.InferType<typeof userSchema>

/** Admin editing someone: name, email, role, access policy and profile details. */
export const userEditSchema = yup.object({
  displayName: yup.string().trim().required('Enter their name.').max(100, 'Keep it to 100 characters or fewer.'),
  primaryEmail: yup
    .string()
    .trim()
    .required('Enter their email.')
    .email('Enter a valid email address.')
    .max(254, 'Keep it to 254 characters or fewer.'),
  roleId: yup.number().typeError('Pick a role.').required('Pick a role.').min(1, 'Pick a role.'),
  /** 0 = no access policy. */
  accessPolicyId: yup.number().default(0),
  details: profileDetailsSchema,
})

export type UserEditFormValues = yup.InferType<typeof userEditSchema>

/** Admin renaming a user. Pass the current name as `context.currentUserName` to reject "no change". */
export const renameUserSchema = yup.object({
  userName: usernameField('Enter a new username.').test(
    'changed',
    'That is already their username.',
    (value, ctx) => value !== (ctx.options.context as { currentUserName?: string } | undefined)?.currentUserName,
  ),
})

export type RenameUserFormValues = yup.InferType<typeof renameUserSchema>

/** Admin setting a new password for a user. */
export const resetPasswordSchema = yup.object({
  password: passwordField('Enter a new password.'),
  confirmPassword: yup
    .string()
    .required('Type the password again.')
    .oneOf([yup.ref('password')], "The passwords don't match."),
})

export type ResetPasswordFormValues = yup.InferType<typeof resetPasswordSchema>
