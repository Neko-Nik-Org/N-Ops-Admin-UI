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

/** Display formatters for numbers, byte sizes and dates. */

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']

/** Human-readable size using 1024 steps: 1536 -> "1.5 KB", 0 or invalid -> "0 B". */
export const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1)
  const value = bytes / 1024 ** exponent
  return `${value >= 10 || exponent === 0 ? Math.round(value) : value.toFixed(1)} ${BYTE_UNITS[exponent]}`
}

/** Locale-aware number with thousands separators: 12345 -> "12,345". */
export const formatNumber = (value: number): string => new Intl.NumberFormat().format(value)

/**
 * Parses an API timestamp: ISO 8601 with a `T` or a space (as PostgreSQL prints it), an optional
 * offset (`Z`, `+05:30`, `+00`), or a bare date, which counts as local midnight like moment did.
 * Invalid input gives null. Uses the browser's own date code, so no date library loads for this.
 */
export const parseIso = (iso: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(Z|[+-]\d{2}(?::?\d{2})?)?)?$/.exec(
    iso.trim(),
  )
  if (!m) return null
  const [, y, mo, d, h = '0', mi = '0', sec = '0', frac = '0', zone] = m
  const ms = Number(frac.slice(0, 3).padEnd(3, '0'))
  const local = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(sec), ms)
  if (local.getMonth() !== Number(mo) - 1 || local.getDate() !== Number(d)) return null // e.g. Feb 30
  if (!zone) return local
  const utc = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(sec), ms)
  if (zone === 'Z') return new Date(utc)
  const sign = zone[0] === '-' ? -1 : 1
  const [oh, om = '0'] = zone
    .slice(1)
    .replace(':', '')
    .match(/^(\d{2})(\d{2})?$/)!
    .slice(1)
  return new Date(utc - sign * (Number(oh) * 60 + Number(om)) * 60_000)
}

const DATE = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const TIME = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })
/** Newer ICU puts a narrow no-break space before AM/PM; a plain space reads the same and matches tests. */
const time = (d: Date) => TIME.format(d).replace(/\u202f/g, ' ')

/** Medium-length date from an ISO string, e.g. "Nov 13, 2026"; returns "—" for invalid input. */
export const formatDate = (iso: string): string => {
  const date = parseIso(iso)
  return date ? DATE.format(date) : '—'
}

/** Date and time from an ISO string, e.g. "Nov 13, 2026 9:41 AM"; "—" for invalid input. */
export const formatDateTime = (iso: string): string => {
  const date = parseIso(iso)
  return date ? `${DATE.format(date)} ${time(date)}` : '—'
}

/**
 * "3 hours ago" / "in 6 days" for a date, with the same wording and thresholds as moment's fromNow()
 * (which this replaces): seconds under 45 s, minutes under 45 min, hours under 22 h, days under 26 d,
 * months under 11 months, then years.
 */
export const fromNow = (date: Date, now: number = Date.now()): string => {
  const diff = date.getTime() - now
  const s = Math.round(Math.abs(diff) / 1000)
  const min = Math.round(s / 60)
  const h = Math.round(min / 60)
  const d = Math.round(h / 24)
  const mo = Math.round(d / 30.4375)
  const y = Math.round(d / 365.25)
  const text =
    s < 45
      ? 'a few seconds'
      : s < 90
        ? 'a minute'
        : min < 45
          ? `${min} minutes`
          : min < 90
            ? 'an hour'
            : h < 22
              ? `${h} hours`
              : h < 36
                ? 'a day'
                : d < 26
                  ? `${d} days`
                  : d < 45
                    ? 'a month'
                    : d < 320
                      ? `${mo} months`
                      : d < 548
                        ? 'a year'
                        : `${y} years`
  return diff > 0 ? `in ${text}` : `${text} ago`
}

/** Relative time from an ISO string, e.g. "3 hours ago" or "in 6 days"; `fallback` for null/invalid. */
export const formatRelative = (iso: string | null | undefined, fallback = 'Never'): string => {
  const date = iso ? parseIso(iso) : null
  return date ? fromNow(date) : fallback
}

/** "3 users", "1 user". */
export const usersLabel = (count: number): string => `${count} ${count === 1 ? 'user' : 'users'}`
