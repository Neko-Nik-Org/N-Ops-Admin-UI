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
 * The structure of a user's profile details (`/user/self/details`, stored in `app_user.user_details`).
 * The API accepts any JSON object and replaces it whole on save; this app gives it a shape that's
 * useful for running infrastructure: who someone is, how and when to reach them, who to call in an
 * and their engineering identities (SSH keys for the planned server access).
 *
 * Stored as (snake_case, empty values left out):
 *
 *   {
 *     "version": 1,
 *     "work":              { "job_title", "department", "employee_id", "location" },
 *     "contact":           { "phone", "chat_handle", "alternate_email" },
 *     "availability":      { "timezone", "working_hours": { "start", "end" }, "working_days": ["mon", …] },
 *     "engineering":       { "github_username", "gitlab_username", "expertise": [], "ssh_public_keys": [] },
 *     "custom":            { "<label>": "<value>" }
 *   }
 *
 * Older, free-form details (top-level "Label": "value" text) are read too: a few well-known labels
 * move to their field, other text goes to `custom`, and anything else is saved back untouched.
 */

import type { JsonObject } from '@/types/account'

export const PROFILE_DETAILS_VERSION = 1

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export type Weekday = (typeof WEEKDAYS)[number]
export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
}

export interface CustomDetail {
  label: string
  value: string
}

/** The details in app form (camelCase, every field present; '' or [] when unset). */
export interface ProfileDetails {
  work: { jobTitle: string; department: string; employeeId: string; location: string }
  contact: { phone: string; chatHandle: string; alternateEmail: string }
  availability: { timezone: string; workStart: string; workEnd: string; workDays: Weekday[] }
  engineering: { githubUsername: string; gitlabUsername: string; expertise: string[]; sshPublicKeys: string[] }
  custom: CustomDetail[]
}

export const emptyProfileDetails = (): ProfileDetails => ({
  work: { jobTitle: '', department: '', employeeId: '', location: '' },
  contact: { phone: '', chatHandle: '', alternateEmail: '' },
  availability: { timezone: '', workStart: '', workEnd: '', workDays: [] },
  engineering: { githubUsername: '', gitlabUsername: '', expertise: [], sshPublicKeys: [] },
  custom: [],
})

/** Top-level keys this structure owns; any other non-text key is kept as it was. */
const OWN_KEYS = new Set(['version', 'work', 'contact', 'availability', 'engineering', 'custom'])

/** Free-form labels from before the structure, and where they go now (compared lower-case). */
const LEGACY_LABELS: Record<string, (d: ProfileDetails, v: string) => void> = {
  'job title': (d, v) => (d.work.jobTitle = v),
  title: (d, v) => (d.work.jobTitle = v),
  team: (d, v) => (d.work.department = v),
  department: (d, v) => (d.work.department = v),
  phone: (d, v) => (d.contact.phone = v),
  location: (d, v) => (d.work.location = v),
  timezone: (d, v) => (d.availability.timezone = v),
}

const obj = (v: unknown): JsonObject => (v && typeof v === 'object' && !Array.isArray(v) ? (v as JsonObject) : {})
const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

/** Reads saved details (any shape) into the structure, plus whatever it doesn't own, to save back as-is. */
export const parseProfileDetails = (raw: JsonObject): { details: ProfileDetails; preserved: JsonObject } => {
  const d = emptyProfileDetails()
  const preserved: JsonObject = {}

  const work = obj(raw.work)
  d.work = {
    jobTitle: str(work.job_title),
    department: str(work.department),
    employeeId: str(work.employee_id),
    location: str(work.location),
  }
  const contact = obj(raw.contact)
  d.contact = { phone: str(contact.phone), chatHandle: str(contact.chat_handle), alternateEmail: str(contact.alternate_email) }
  const availability = obj(raw.availability)
  const hours = obj(availability.working_hours)
  d.availability = {
    timezone: str(availability.timezone),
    workStart: str(hours.start),
    workEnd: str(hours.end),
    workDays: strings(availability.working_days).filter((x): x is Weekday => (WEEKDAYS as readonly string[]).includes(x)),
  }
  const eng = obj(raw.engineering)
  d.engineering = {
    githubUsername: str(eng.github_username),
    gitlabUsername: str(eng.gitlab_username),
    expertise: strings(eng.expertise),
    sshPublicKeys: strings(eng.ssh_public_keys),
  }
  d.custom = Object.entries(obj(raw.custom))
    .filter(([, v]) => typeof v === 'string')
    .map(([label, value]) => ({ label, value: value as string }))

  // anything outside the structure: old free-form text, or values another client wrote
  for (const [key, value] of Object.entries(raw)) {
    if (OWN_KEYS.has(key)) {
      // a non-object where a group belongs (an old free-form "work": "…", say) is kept as written
      if (key !== 'version' && key !== 'custom' && (value === null || typeof value !== 'object' || Array.isArray(value)))
        preserved[key] = value
      continue
    }
    if (typeof value !== 'string') {
      preserved[key] = value
      continue
    }
    const legacy = LEGACY_LABELS[key.trim().toLowerCase()]
    if (legacy) legacy(d, value)
    else d.custom.push({ label: key, value })
  }
  return { details: d, preserved }
}

/** Keeps only non-empty values, so the saved object stays small. */
const compact = (group: Record<string, unknown>): JsonObject | undefined => {
  const out: JsonObject = {}
  for (const [k, v] of Object.entries(group)) {
    if (
      typeof v === 'string' ? v.trim() : Array.isArray(v) ? v.length : v && typeof v === 'object' ? Object.keys(v).length : false
    )
      out[k] = typeof v === 'string' ? v.trim() : v
  }
  return Object.keys(out).length ? out : undefined
}

/** The object to POST: preserved values, the version, and every non-empty group. */
export const serializeProfileDetails = (d: ProfileDetails, preserved: JsonObject = {}): JsonObject => {
  const hours = compact({ start: d.availability.workStart, end: d.availability.workEnd })
  const groups: Record<string, JsonObject | undefined> = {
    work: compact({
      job_title: d.work.jobTitle,
      department: d.work.department,
      employee_id: d.work.employeeId,
      location: d.work.location,
    }),
    contact: compact({ phone: d.contact.phone, chat_handle: d.contact.chatHandle, alternate_email: d.contact.alternateEmail }),
    availability: compact({
      timezone: d.availability.timezone,
      working_hours: hours ?? {},
      // in week order, whatever order they were ticked in
      working_days: WEEKDAYS.filter((day) => d.availability.workDays.includes(day)),
    }),
    engineering: compact({
      github_username: d.engineering.githubUsername,
      gitlab_username: d.engineering.gitlabUsername,
      expertise: d.engineering.expertise.map((x) => x.trim()).filter(Boolean),
      ssh_public_keys: d.engineering.sshPublicKeys.map((x) => x.trim()).filter(Boolean),
    }),
    custom: compact(Object.fromEntries(d.custom.filter((c) => c.label.trim()).map((c) => [c.label.trim(), c.value]))),
  }
  const out: JsonObject = { ...preserved, version: PROFILE_DETAILS_VERSION }
  for (const [key, value] of Object.entries(groups)) if (value) out[key] = value
  return out
}

/** True when nothing at all is filled in. */
export const isProfileDetailsEmpty = (d: ProfileDetails): boolean => Object.keys(serializeProfileDetails(d)).length === 1 // just the version

/** "ssh-ed25519 AAAA…QwXy priya@laptop": the key's type, a shortened body and its comment. */
export const describeSshKey = (key: string): { type: string; short: string; comment: string } => {
  const [type = '', body = '', ...rest] = key.trim().split(/\s+/)
  return { type, short: body.length > 16 ? `${body.slice(0, 8)}…${body.slice(-8)}` : body, comment: rest.join(' ') }
}

/** Accepted SSH public key types (OpenSSH format: "<type> <base64> [comment]"). */
export const SSH_KEY_PATTERN =
  /^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp(256|384|521)|sk-ssh-ed25519@openssh\.com|sk-ecdsa-sha2-nistp256@openssh\.com) [A-Za-z0-9+/]+={0,3}( .*)?$/

/** Every IANA time zone the browser knows, for the picker (a short list when it can't say). */
export const timeZones = (): string[] => {
  try {
    const intl = Intl as typeof Intl & { supportedValuesOf?: (key: 'timeZone') => string[] }
    const zones = intl.supportedValuesOf?.('timeZone')
    if (zones?.length) return zones
  } catch {
    // fall through
  }
  return [
    'UTC',
    'Europe/London',
    'Europe/Berlin',
    'Asia/Kolkata',
    'Asia/Singapore',
    'Asia/Tokyo',
    'America/New_York',
    'America/Los_Angeles',
    'Australia/Sydney',
  ]
}

/** The browser's own time zone, offered as the default. */
export const browserTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return ''
  }
}

/** Current time in `timeZone`, e.g. "3:42 PM"; '' for an unknown zone. */
export const localTimeIn = (timeZone: string, now = new Date()): string => {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }).format(now).replace(/ /g, ' ')
  } catch {
    return ''
  }
}
