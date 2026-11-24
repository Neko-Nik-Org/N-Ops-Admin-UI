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
 * The structure of an organization's profile (`organization.organization_info`), which the API keeps
 * as free JSON. Super admins edit it; the organization's own admins and members see it. It's stored
 * flat, with snake_case keys and text values (empty ones left out), so any page that lists the raw
 * object still reads well:
 *
 *   { "legal_name", "description", "website", "industry", "company_size",
 *     "primary_contact_name", "primary_contact_email", "support_email", "security_email", "phone",
 *     "country", "timezone", "address" }
 *
 * Other keys are kept: text ones are shown and editable as extra fields, anything else is saved back
 * untouched.
 */

import { countryName } from '@/constants/countries'

export type OrgProfileKey =
  | 'legal_name'
  | 'description'
  | 'website'
  | 'industry'
  | 'company_size'
  | 'primary_contact_name'
  | 'primary_contact_email'
  | 'support_email'
  | 'security_email'
  | 'phone'
  | 'country'
  | 'timezone'
  | 'address'

export type OrgProfileGroup = 'Company' | 'Contacts' | 'Location'

export interface OrgProfileField {
  key: OrgProfileKey
  label: string
  group: OrgProfileGroup
  kind: 'text' | 'email' | 'url' | 'tel' | 'textarea' | 'industry' | 'size' | 'country' | 'timezone'
  placeholder?: string
  hint?: string
  max: number
}

/** Every profile field, in display order. */
export const ORG_PROFILE_FIELDS: readonly OrgProfileField[] = [
  { key: 'legal_name', label: 'Legal name', group: 'Company', kind: 'text', placeholder: 'Neko Nik Pvt. Ltd.', max: 250 },
  {
    key: 'description',
    label: 'Description',
    group: 'Company',
    kind: 'textarea',
    placeholder: 'What the organization does',
    max: 1000,
  },
  { key: 'website', label: 'Website', group: 'Company', kind: 'url', placeholder: 'https://example.com', max: 250 },
  { key: 'industry', label: 'Industry', group: 'Company', kind: 'industry', max: 100 },
  { key: 'company_size', label: 'Company size', group: 'Company', kind: 'size', max: 50 },
  { key: 'primary_contact_name', label: 'Primary contact', group: 'Contacts', kind: 'text', placeholder: 'Priya Rao', max: 100 },
  {
    key: 'primary_contact_email',
    label: 'Primary contact email',
    group: 'Contacts',
    kind: 'email',
    placeholder: 'priya@example.com',
    max: 254,
  },
  {
    key: 'support_email',
    label: 'Support email',
    group: 'Contacts',
    kind: 'email',
    placeholder: 'support@example.com',
    hint: 'Where members go for help with their access.',
    max: 254,
  },
  {
    key: 'security_email',
    label: 'Security contact email',
    group: 'Contacts',
    kind: 'email',
    placeholder: 'security@example.com',
    hint: 'For security incidents and suspicious sign-ins.',
    max: 254,
  },
  { key: 'phone', label: 'Phone', group: 'Contacts', kind: 'tel', placeholder: '+91 98765 43210', max: 40 },
  { key: 'country', label: 'Country', group: 'Location', kind: 'country', max: 2 },
  {
    key: 'timezone',
    label: 'Time zone',
    group: 'Location',
    kind: 'timezone',
    hint: 'The working time zone, e.g. for maintenance windows.',
    max: 64,
  },
  {
    key: 'address',
    label: 'Address',
    group: 'Location',
    kind: 'textarea',
    placeholder: 'Registered or office address',
    max: 500,
  },
]

export const ORG_PROFILE_GROUPS: readonly OrgProfileGroup[] = ['Company', 'Contacts', 'Location']

export const INDUSTRIES = [
  'Software and technology',
  'Financial services',
  'Healthcare',
  'E-commerce and retail',
  'Education',
  'Government and public sector',
  'Media and entertainment',
  'Manufacturing',
  'Telecommunications',
  'Logistics and transport',
  'Other',
] as const

export const COMPANY_SIZES = ['1–10', '11–50', '51–200', '201–1,000', '1,001–5,000', '5,000+'] as const

export type OrgProfileValues = Record<OrgProfileKey, string>

/** An extra text field that isn't one of ORG_PROFILE_FIELDS. */
export interface OrgProfileExtra {
  label: string
  value: string
}

const KNOWN = new Set<string>(ORG_PROFILE_FIELDS.map((f) => f.key))

export const emptyOrgProfile = (): OrgProfileValues =>
  Object.fromEntries(ORG_PROFILE_FIELDS.map((f) => [f.key, ''])) as OrgProfileValues

/** Saved JSON → the known fields, other text fields, and everything else (kept as is). */
export const parseOrgProfile = (info: Record<string, unknown>) => {
  const values = emptyOrgProfile()
  const extras: OrgProfileExtra[] = []
  const kept: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(info)) {
    if (KNOWN.has(key) && typeof value === 'string') values[key as OrgProfileKey] = value
    else if (typeof value === 'string') extras.push({ label: key, value })
    else kept[key] = value
  }
  return { values, extras, kept }
}

/** The known fields, extra fields and kept values → the JSON to save. Empty text is left out. */
export const serializeOrgProfile = (
  values: Partial<OrgProfileValues>,
  extras: readonly OrgProfileExtra[] = [],
  kept: Record<string, unknown> = {},
): Record<string, unknown> => {
  const out: Record<string, unknown> = { ...kept }
  for (const { label, value } of extras) if (label.trim() && value.trim()) out[label.trim()] = value.trim()
  for (const f of ORG_PROFILE_FIELDS) {
    const v = (values[f.key] ?? '').trim()
    if (v) out[f.key] = f.kind === 'country' ? v.toUpperCase() : v
    else delete out[f.key]
  }
  return out
}

/** "contact_email" → "Contact email". */
export const humanizeKey = (key: string) => {
  const words = key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** A saved profile as label / value pairs for display: known fields in order, then the rest. */
export const describeOrgProfile = (info: Record<string, unknown>): Array<{ key: string; label: string; value: string }> => {
  const out: Array<{ key: string; label: string; value: string }> = []
  for (const f of ORG_PROFILE_FIELDS) {
    const v = info[f.key]
    if (typeof v !== 'string' || !v.trim()) continue
    out.push({ key: f.key, label: f.label, value: f.kind === 'country' ? `${countryName(v)} (${v.toUpperCase()})` : v })
  }
  for (const [key, v] of Object.entries(info)) {
    if (KNOWN.has(key) && typeof v === 'string') continue
    out.push({ key, label: humanizeKey(key), value: typeof v === 'string' ? v || '—' : v === null ? '—' : JSON.stringify(v) })
  }
  return out
}
