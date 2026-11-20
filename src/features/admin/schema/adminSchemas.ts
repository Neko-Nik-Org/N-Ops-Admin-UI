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
/** Validation rules for the Admin forms. Limits mirror the column sizes in the API schema. */

import * as yup from 'yup'
import { passwordField, usernameField } from '@/features/account/schema/accountSchemas'

/** IPv4 address, optionally with a CIDR suffix (e.g. 203.0.113.0/24). */
const IPV4_CIDR = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}(\/(3[0-2]|[12]?\d))?$/

/** Splits a comma- or newline-separated list into trimmed, non-empty items. */
export const splitList = (value: string | undefined): string[] =>
  (value ?? '')
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)

/** Two-letter country code, as the API's IP location lookup reports it. */
const COUNTRY_CODE = /^[A-Za-z]{2}$/

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
  hasIpRestriction: yup.boolean().default(false),
  allowedIps: yup
    .string()
    .default('')
    .when('hasIpRestriction', {
      is: true,
      then: (s) =>
        s
          .test('has-ips', 'Add at least one IP address.', (v) => splitList(v).length > 0)
          .test('valid-ips', 'Use IPv4 addresses or ranges, like 203.0.113.0/24.', (v) =>
            splitList(v).every((ip) => IPV4_CIDR.test(ip)),
          ),
    }),
  hasGeoRestriction: yup.boolean().default(false),
  allowedGeoLocations: yup
    .string()
    .default('')
    .when('hasGeoRestriction', {
      is: true,
      then: (s) =>
        s
          .test('has-countries', 'Add at least one country.', (v) => splitList(v).length > 0)
          .test('valid-countries', 'Use two-letter country codes, like IN or US.', (v) =>
            splitList(v).every((c) => COUNTRY_CODE.test(c)),
          ),
    }),
})
export type UserFormValues = yup.InferType<typeof userSchema>

export const roleSchema = yup.object({
  roleName: yup.string().trim().required('Enter a role name.').max(100, 'Keep it to 100 characters or fewer.'),
  roleDescription: yup.string().trim().default(''),
  permissions: yup.array(yup.string().required()).min(1, 'Give the role at least one permission.').default([]),
  tagIds: yup.array(yup.number().required()).default([]),
  canApproveApprovals: yup.boolean().default(false),
  canBypassApprovals: yup.boolean().default(false),
  allowedLinuxUsers: yup
    .string()
    .default('')
    .test('linux-users', 'Linux usernames use lowercase letters, numbers, - and _.', (v) =>
      splitList(v).every((u) => /^[a-z_][a-z0-9_-]{0,31}$/.test(u)),
    ),
})
export type RoleFormValues = yup.InferType<typeof roleSchema>

export const apiKeySchema = yup.object({
  keyName: yup
    .string()
    .trim()
    .required('Enter a name.')
    .max(100, 'Keep it to 100 characters or fewer.')
    .matches(/^[A-Za-z0-9._-]+$/, 'Use letters, numbers, dots, dashes or underscores.'),
  keyDescription: yup.string().trim().required('Say what this key is for.'),
  roleId: yup.number().typeError('Pick a role.').required('Pick a role.').min(1, 'Pick a role.'),
  tagId: yup.number().typeError('Pick a tag.').required('Pick a tag.').min(1, 'Pick a tag.'),
  vaultProjectIds: yup.array(yup.number().required()).min(1, 'Pick at least one vault project.').default([]),
  isActive: yup.boolean().default(true),
  /** '' = never expires; otherwise YYYY-MM-DD. */
  expiresOn: yup
    .string()
    .default('')
    .test('future', 'Pick a date after today.', (v) => !v || new Date(`${v}T23:59:59`) > new Date()),
})
export type ApiKeyFormValues = yup.InferType<typeof apiKeySchema>

export const exportScheduleSchema = yup.object({
  frequency: yup.mixed<'daily' | 'weekly' | 'monthly'>().oneOf(['daily', 'weekly', 'monthly']).required(),
  format: yup.mixed<'csv' | 'json'>().oneOf(['csv', 'json']).required(),
  recipients: yup
    .string()
    .default('')
    .test('has', 'Add at least one email address.', (v) => splitList(v).length > 0)
    .test('emails', 'One of those isn’t a valid email address.', (v) =>
      splitList(v).every((e) => yup.string().email().isValidSync(e)),
    ),
  enabled: yup.boolean().default(true),
})
export type ExportScheduleFormValues = yup.InferType<typeof exportScheduleSchema>

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
