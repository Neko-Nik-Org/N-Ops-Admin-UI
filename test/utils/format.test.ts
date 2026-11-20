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
/** Tests for src/utils/format.ts: the date helpers that replaced moment on the common path. */

import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime, formatRelative, fromNow, parseIso } from '@/utils/format'

describe('parseIso', () => {
  it('reads the timestamp shapes the API sends', () => {
    const utc = Date.UTC(2026, 10, 13, 9, 58, 0, 123)
    expect(parseIso('2026-11-13T09:58:00.123456Z')?.getTime()).toBe(utc)
    expect(parseIso('2026-11-13 09:58:00.123+00')?.getTime()).toBe(utc)
    expect(parseIso('2026-11-13T15:28:00.123+05:30')?.getTime()).toBe(utc)
    expect(parseIso('2026-11-13T09:58:00')?.getTime()).toBe(new Date(2026, 10, 13, 9, 58).getTime()) // local
    expect(parseIso('2026-11-13')?.getTime()).toBe(new Date(2026, 10, 13).getTime()) // local midnight
  })

  it('rejects anything else', () => {
    for (const bad of ['', 'yesterday', '2026-02-30', '13/11/2026', '2026-11-13T25']) expect(parseIso(bad), bad).toBeNull()
  })
})

describe('formatters', () => {
  it('formats dates like moment did', () => {
    expect(formatDate('2026-11-13')).toBe('Nov 13, 2026')
    expect(formatDateTime('2026-11-13T09:58:00')).toBe('Nov 13, 2026 9:58 AM')
    expect(formatDate('nope')).toBe('—')
  })

  it('words relative times with the same thresholds', () => {
    const now = Date.UTC(2026, 10, 20, 12)
    const ago = (ms: number) => fromNow(new Date(now - ms), now)
    const S = 1000
    const M = 60 * S
    const H = 60 * M
    const D = 24 * H
    expect(ago(10 * S)).toBe('a few seconds ago')
    expect(ago(60 * S)).toBe('a minute ago')
    expect(ago(5 * M)).toBe('5 minutes ago')
    expect(ago(60 * M)).toBe('an hour ago')
    expect(ago(3 * H)).toBe('3 hours ago')
    expect(ago(30 * H)).toBe('a day ago')
    expect(ago(3 * D)).toBe('3 days ago')
    expect(ago(40 * D)).toBe('a month ago')
    expect(ago(100 * D)).toBe('3 months ago')
    expect(ago(400 * D)).toBe('a year ago')
    expect(ago(1000 * D)).toBe('3 years ago')
    expect(fromNow(new Date(now + 6 * D), now)).toBe('in 6 days')
    expect(formatRelative(null)).toBe('Never')
    expect(formatRelative('bad', 'n/a')).toBe('n/a')
  })
})
