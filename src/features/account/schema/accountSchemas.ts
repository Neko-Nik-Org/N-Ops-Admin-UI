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

/** Length in UTF-8 bytes, which is what the API's Rust `str::len()` counts. */
const byteLength = (value: string): number => new TextEncoder().encode(value).length

/** Password rules, in the order the API checks them. Each returns an error message or null. */
const PASSWORD_RULES: Array<[test: (v: string) => boolean, message: string]> = [
  [(v) => byteLength(v) >= 8 && byteLength(v) <= 64, 'Use between 8 and 64 characters.'],
  [(v) => /\p{Lu}/u.test(v), 'Add at least one uppercase letter.'],
  [(v) => /\p{Ll}/u.test(v), 'Add at least one lowercase letter.'],
  [(v) => /[0-9]/.test(v), 'Add at least one digit.'],
  [(v) => /[^\p{L}\p{N}]/u.test(v), 'Add at least one special character.'],
]

/** Username rules, in the order the API checks them. */
const USERNAME_RULES: Array<[test: (v: string) => boolean, message: string]> = [
  [(v) => v.length >= 3 && v.length <= 100, 'Use between 3 and 100 characters.'],
  [(v) => /^[A-Za-z0-9_]+$/.test(v), 'Use only letters (A–Z), digits and underscores.'],
  [(v) => !/^[0-9]/.test(v), "Don't start with a digit."],
  [(v) => !v.includes('__'), "Don't use two underscores in a row."],
  [(v) => !v.startsWith('_') && !v.endsWith('_'), "Don't start or end with an underscore."],
]

/** First rule a value breaks, or null when it passes them all. */
const firstFailure = (rules: typeof PASSWORD_RULES, value: string): string | null =>
  rules.find(([test]) => !test(value))?.[1] ?? null

/** The policy message for an invalid username, or null when the API would accept it. */
export const usernamePolicyError = (value: string): string | null => firstFailure(USERNAME_RULES, value)

/**
 * Adds one yup test per rule, so the field shows the first rule it breaks.
 * Generic over the caller's exact string schema (e.g. `.required()`), so its type isn't widened.
 */
const withRules = <S extends yup.StringSchema<any, any, any, any>>(schema: S, rules: typeof PASSWORD_RULES): S =>
  schema.test('policy', function check(value: string | undefined) {
    const message = firstFailure(rules, value ?? '')
    return message ? this.createError({ message }) : true
  })

/** New password plus confirmation. No current password: the API authorizes the change by session alone. */
export const changePasswordSchema = yup.object({
  newPassword: withRules(yup.string().required('Enter a new password.'), PASSWORD_RULES),
  confirmPassword: yup
    .string()
    .required('Type the new password again.')
    .oneOf([yup.ref('newPassword')], "The passwords don't match."),
})

/** Values produced by the change-password form. */
export type ChangePasswordFormValues = yup.InferType<typeof changePasswordSchema>

/** New username; pass the current one as `context.currentUserName` to reject "no change". */
export const changeUsernameSchema = yup.object({
  userName: withRules(yup.string().trim().required('Enter a new username.'), USERNAME_RULES).test(
    'changed',
    'That is already your username.',
    (value, ctx) => value !== (ctx.options.context as { currentUserName?: string } | undefined)?.currentUserName,
  ),
})

/** Values produced by the change-username form. */
export type ChangeUsernameFormValues = yup.InferType<typeof changeUsernameSchema>

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
