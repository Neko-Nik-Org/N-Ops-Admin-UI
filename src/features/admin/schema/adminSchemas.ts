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

/** IPv4 address, optionally with a CIDR suffix (e.g. 203.0.113.0/24). */
const IPV4_CIDR = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}(\/(3[0-2]|[12]?\d))?$/

/** Splits a comma- or newline-separated list into trimmed, non-empty items. */
export const splitList = (value: string | undefined): string[] =>
  (value ?? '')
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)

export const organizationSchema = yup.object({
  organizationName: yup.string().trim().required('Enter an organization name.').max(250, 'Keep it to 250 characters or fewer.'),
  description: yup.string().trim().max(500, 'Keep it to 500 characters or fewer.').default(''),
  website: yup.string().trim().url('Enter a full URL, like https://example.com.').default(''),
  contactEmail: yup.string().trim().email('Enter a valid email address.').default(''),
  timezone: yup.string().required(),
})
export type OrganizationFormValues = yup.InferType<typeof organizationSchema>

export const userSchema = yup.object({
  userName: yup
    .string()
    .trim()
    .required('Enter a username.')
    .max(100, 'Keep it to 100 characters or fewer.')
    .matches(/^[a-z0-9._-]+$/, 'Use lowercase letters, numbers, dots, dashes or underscores.'),
  displayName: yup.string().trim().required('Enter their name.').max(100, 'Keep it to 100 characters or fewer.'),
  primaryEmail: yup.string().trim().required('Enter their email.').email('Enter a valid email address.').max(254),
  roleId: yup.number().typeError('Pick a role.').required('Pick a role.').min(1, 'Pick a role.'),
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
          .test('valid-ips', 'Use IPv4 addresses or ranges, like 203.0.113.0/24.', (v) => splitList(v).every((ip) => IPV4_CIDR.test(ip))),
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
    .test('emails', 'One of those isn’t a valid email address.', (v) => splitList(v).every((e) => yup.string().email().isValidSync(e))),
  enabled: yup.boolean().default(true),
})
export type ExportScheduleFormValues = yup.InferType<typeof exportScheduleSchema>
