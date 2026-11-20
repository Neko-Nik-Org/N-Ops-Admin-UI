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
 * Validation for the self-service account forms. The rules mirror the Main API's
 * `validate_base64_password` and `validate_username` (src/security/auth_tools.rs), so users see
 * the problem before submitting. The API still enforces them.
 */

import * as yup from 'yup'
import { firstFailure, PASSWORD_RULES, USERNAME_RULES, type Rules } from './policies'

export { usernamePolicyError } from './policies'

/**
 * Adds one yup test per rule, so the field shows the first rule it breaks.
 * Generic over the caller's exact string schema (e.g. `.required()`), so its type isn't widened.
 */
const withRules = <S extends yup.StringSchema<any, any, any, any>>(schema: S, rules: Rules): S =>
  schema.test('policy', function check(value: string | undefined) {
    const message = firstFailure(rules, value ?? '')
    return message ? this.createError({ message }) : true
  })

/** A username field with the API's rules (also used when an admin adds or renames a user). */
export const usernameField = (requiredMessage: string) => withRules(yup.string().trim().required(requiredMessage), USERNAME_RULES)

/** A password field with the API's rules (also used when an admin adds a user or resets a password). */
export const passwordField = (requiredMessage: string) => withRules(yup.string().required(requiredMessage), PASSWORD_RULES)

/** New password plus confirmation. No current password: the API authorizes the change by session alone. */
export const changePasswordSchema = yup.object({
  newPassword: passwordField('Enter a new password.'),
  confirmPassword: yup
    .string()
    .required('Type the new password again.')
    .oneOf([yup.ref('newPassword')], "The passwords don't match."),
})

/** Values produced by the change-password form. */
export type ChangePasswordFormValues = yup.InferType<typeof changePasswordSchema>

/** New username; pass the current one as `context.currentUserName` to reject "no change". */
export const changeUsernameSchema = yup.object({
  userName: usernameField('Enter a new username.').test(
    'changed',
    'That is already your username.',
    (value, ctx) => value !== (ctx.options.context as { currentUserName?: string } | undefined)?.currentUserName,
  ),
})

/** Values produced by the change-username form. */
export type ChangeUsernameFormValues = yup.InferType<typeof changeUsernameSchema>

/** Display name and email; limits match the `app_user` columns (VARCHAR 100 / 254). */
export const editProfileSchema = yup.object({
  displayName: yup.string().trim().required('Enter your name.').max(100, 'Keep it to 100 characters or fewer.'),
  primaryEmail: yup
    .string()
    .trim()
    .required('Enter your email address.')
    .email('Enter a valid email address.')
    .max(254, 'Keep it to 254 characters or fewer.'),
})

/** Values produced by the edit-profile form. */
export type EditProfileFormValues = yup.InferType<typeof editProfileSchema>

/** Longest label and value accepted in the profile details editor. */
export const DETAIL_LABEL_MAX = 50
export const DETAIL_VALUE_MAX = 500
/** Most text fields the profile details editor allows. */
export const DETAIL_FIELDS_MAX = 20

/**
 * Text fields of the free-form profile details (`/user/self/details`). The API accepts any JSON;
 * these limits only keep the object small and readable. Labels must be unique.
 */
export const profileDetailsSchema = yup.object({
  fields: yup
    .array(
      yup.object({
        label: yup
          .string()
          .trim()
          .required('Enter a label.')
          .max(DETAIL_LABEL_MAX, `Use at most ${DETAIL_LABEL_MAX} characters.`),
        value: yup.string().trim().max(DETAIL_VALUE_MAX, `Use at most ${DETAIL_VALUE_MAX} characters.`).default(''),
      }),
    )
    .max(DETAIL_FIELDS_MAX, `Add at most ${DETAIL_FIELDS_MAX} fields.`)
    .test('unique-labels', 'Each label can only be used once.', function unique(fields) {
      const seen = new Set<string>()
      for (const [index, field] of (fields ?? []).entries()) {
        const key = (field.label ?? '').trim().toLowerCase()
        if (!key) continue
        if (seen.has(key)) return this.createError({ path: `fields[${index}].label`, message: 'This label is already used.' })
        seen.add(key)
      }
      return true
    })
    .required(),
})

/** Values produced by the profile details form. */
export type ProfileDetailsFormValues = yup.InferType<typeof profileDetailsSchema>
