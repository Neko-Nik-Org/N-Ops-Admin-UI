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

import moment from 'moment'

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

/** Medium-length date from an ISO string, e.g. "Nov 13, 2026"; returns "—" for invalid input. */
export const formatDate = (iso: string): string => {
  const date = moment(iso, moment.ISO_8601)
  return date.isValid() ? date.format('ll') : '—'
}

/** Date and time from an ISO string, e.g. "Nov 13, 2026 9:41 AM"; "—" for invalid input. */
export const formatDateTime = (iso: string): string => {
  const date = moment(iso, moment.ISO_8601)
  return date.isValid() ? date.format('lll') : '—'
}

/** Relative time from an ISO string, e.g. "3 hours ago" or "in 6 days"; `fallback` for null/invalid. */
export const formatRelative = (iso: string | null | undefined, fallback = 'Never'): string => {
  if (!iso) return fallback
  const date = moment(iso, moment.ISO_8601)
  return date.isValid() ? date.fromNow() : fallback
}
