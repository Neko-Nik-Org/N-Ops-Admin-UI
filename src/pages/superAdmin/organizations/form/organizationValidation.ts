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
 * Validation and value mapping for the super-admin organization forms (create and edit). The API
 * checks almost nothing itself (see api/organizations.ts), so every form validates before sending.
 */

import * as yup from 'yup'
import { isCountryCode } from '@/constants/countries'
import type { Organization, OrganizationLimits } from '@/types/organization'
import { formatBytes, formatNumber } from '@/utils/format'
import { ORG_PROFILE_FIELDS, type OrgProfileField, type OrgProfileValues } from '@/utils/orgProfile'

export const GB = 1024 ** 3
/** The database's INTEGER columns. */
const INT_MAX = 2_147_483_647
export const NAME_MAX = 250

// ── plan limits ──────────────────────────────────────────

const whole = (label: string, max = INT_MAX) =>
  yup
    .number()
    .typeError(`Enter a number for ${label}.`)
    .required(`Enter a number for ${label}.`)
    .integer('Use a whole number.')
    .min(1, 'At least 1.')
    .max(max, `At most ${formatNumber(max)}.`)

const limitsShape = {
  userLimit: whole('users'),
  serverLimit: whole('servers'),
  workflowLimit: whole('workflows'),
  vaultProjectLimit: whole('vault projects'),
  vaultKeysPerProjectLimit: whole('keys per project'),
  vaultNotesLimit: whole('notes'),
  aiCredit: whole('AI credit', Number.MAX_SAFE_INTEGER),
  storageGb: yup
    .number()
    .typeError('Enter the storage in GB.')
    .required('Enter the storage in GB.')
    .positive('More than 0.')
    .max(Math.floor(Number.MAX_SAFE_INTEGER / GB), 'Too large.'),
}

export type LimitsValues = {
  userLimit: number
  serverLimit: number
  workflowLimit: number
  vaultProjectLimit: number
  vaultKeysPerProjectLimit: number
  vaultNotesLimit: number
  aiCredit: number
  storageGb: number
}

export const toLimitsValues = (l: OrganizationLimits): LimitsValues => ({
  userLimit: l.userLimit,
  serverLimit: l.serverLimit,
  workflowLimit: l.workflowLimit,
  vaultProjectLimit: l.vaultProjectLimit,
  vaultKeysPerProjectLimit: l.vaultKeysPerProjectLimit,
  vaultNotesLimit: l.vaultNotesLimit,
  aiCredit: l.aiCredit,
  // shown in GB, to two decimals
  storageGb: Math.round((l.storageBytes / GB) * 100) / 100,
})

export const fromLimitsValues = (v: LimitsValues): OrganizationLimits => ({
  userLimit: v.userLimit,
  serverLimit: v.serverLimit,
  workflowLimit: v.workflowLimit,
  vaultProjectLimit: v.vaultProjectLimit,
  vaultKeysPerProjectLimit: v.vaultKeysPerProjectLimit,
  vaultNotesLimit: v.vaultNotesLimit,
  aiCredit: v.aiCredit,
  storageBytes: Math.round(v.storageGb * GB),
})

/** An organization's current limits (its AI credit and storage are stored as used / allocated). */
export const limitsOf = (org: Organization): OrganizationLimits => ({
  userLimit: org.userLimit,
  serverLimit: org.serverLimit,
  workflowLimit: org.workflowLimit,
  vaultProjectLimit: org.vaultProjectLimit,
  vaultKeysPerProjectLimit: org.vaultKeysPerProjectLimit,
  vaultNotesLimit: org.vaultNotesLimit,
  aiCredit: org.aiCredit.allocated,
  storageBytes: org.storageBytes.allocated,
})

/** A plan a new organization starts on; every value can be changed in the form. */
export const DEFAULT_LIMITS: OrganizationLimits = {
  userLimit: 25,
  serverLimit: 50,
  workflowLimit: 20,
  vaultProjectLimit: 10,
  vaultKeysPerProjectLimit: 200,
  vaultNotesLimit: 100,
  aiCredit: 1000,
  storageBytes: 10 * GB,
}

/** The limits of an existing organization: the API refuses AI credit or storage below what's used. */
const usedLimitsShape = (org: Organization) => ({
  ...limitsShape,
  aiCredit: limitsShape.aiCredit.min(
    Math.max(1, org.aiCredit.used),
    `At least ${formatNumber(Math.max(1, org.aiCredit.used))}: that much is already used.`,
  ),
  storageGb: limitsShape.storageGb.test(
    'used',
    `At least ${formatBytes(org.storageBytes.used)}: that much is already used.`,
    (gb) => gb === undefined || Math.round(gb * GB) >= org.storageBytes.used,
  ),
})

// ── free-form details ────────────────────────────────────

/** Free-form details as label / value rows. */
export type DetailRow = { label: string; value: string }

const rowsShape = yup
  .array(
    yup.object({
      label: yup.string().trim().required('Enter a label.').max(60, 'At most 60 characters.'),
      value: yup.string().trim().max(1000, 'At most 1,000 characters.').default(''),
    }),
  )
  .max(30, 'At most 30 fields.')
  .test('unique', 'Each label can only be used once.', function unique(rows) {
    const seen = new Set<string>()
    for (const [i, r] of (rows ?? []).entries()) {
      const key = (r.label ?? '').trim().toLowerCase()
      if (!key) continue
      if (seen.has(key)) return this.createError({ path: `${this.path}[${i}].label`, message: 'This label is already used.' })
      seen.add(key)
    }
    return true
  })
  .default([])

/** Text values become rows; anything else (numbers, lists, objects) is kept as it was. */
export const splitDetails = (details: Record<string, unknown>) => {
  const rows: DetailRow[] = []
  const kept: Record<string, unknown> = {}
  for (const [label, value] of Object.entries(details)) {
    if (typeof value === 'string') rows.push({ label, value })
    else kept[label] = value
  }
  return { rows, kept }
}

export const joinDetails = (rows: DetailRow[], kept: Record<string, unknown>) => {
  const out: Record<string, unknown> = { ...kept }
  for (const { label, value } of rows) if (label.trim()) out[label.trim()] = value.trim()
  return out
}

// ── organization profile ─────────────────────────────────

/** Validation for one profile field, from its kind. Every field is optional. */
const profileFieldRule = (f: OrgProfileField) => {
  const base = yup
    .string()
    .trim()
    .default('')
    .max(f.max, `At most ${formatNumber(f.max)} characters.`)
  switch (f.kind) {
    case 'email':
      return base.email('Enter a valid email address.')
    case 'url':
      return base.matches(/^https?:\/\/[^\s.]+\.\S+$/, {
        message: 'Enter a full address, like https://example.com.',
        excludeEmptyString: true,
      })
    case 'tel':
      return base.matches(/^\+?[\d\s().-]{5,}$/, { message: 'Use digits, spaces and + ( ) - only.', excludeEmptyString: true })
    case 'country':
      return base.test('country', 'Pick a country from the list.', (v) => !v || isCountryCode(v))
    default:
      return base
  }
}

const profileShape = yup.object(
  Object.fromEntries(ORG_PROFILE_FIELDS.map((f) => [f.key, profileFieldRule(f)])) as Record<
    keyof OrgProfileValues,
    ReturnType<typeof profileFieldRule>
  >,
)

const KNOWN_PROFILE_KEYS = new Set<string>(ORG_PROFILE_FIELDS.map((f) => f.key))

/** Extra label / value rows; a label can't reuse one of the profile's own fields. */
const extrasShape = rowsShape.test('not-known', 'Use the field above instead.', function notKnown(rows) {
  for (const [i, r] of (rows ?? []).entries())
    if (KNOWN_PROFILE_KEYS.has((r.label ?? '').trim()))
      return this.createError({ path: `${this.path}[${i}].label`, message: 'That one has its own field above.' })
  return true
})

const nameField = () => yup.string().trim().required('Enter a name.').max(NAME_MAX, `At most ${NAME_MAX} characters.`)

// ── the forms ────────────────────────────────────────────

export const createSchema = yup.object({
  organizationName: nameField(),
  isActive: yup.boolean().default(true),
  limits: yup.object(limitsShape),
  profile: profileShape,
  billing: rowsShape,
})
export type CreateValues = yup.InferType<typeof createSchema>

/** Everything the edit page changes; enabling / disabling stays on the organization's page. */
export const editSchema = (org: Organization) =>
  yup.object({
    organizationName: nameField(),
    limits: yup.object(usedLimitsShape(org)),
    profile: profileShape,
    extras: extrasShape,
    billing: rowsShape,
  })
export type EditValues = yup.InferType<ReturnType<typeof editSchema>>
