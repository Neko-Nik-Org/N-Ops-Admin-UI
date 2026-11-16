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

/** Tests for src/features/account/details.ts. */

import { describe, expect, it } from 'vitest'
import { formatDetailValue, mergeDetails, splitDetails } from '@/features/account/details'

describe('profile details helpers', () => {
  it('splits text fields from other values', () => {
    expect(splitDetails({ Team: 'SRE', age: 3, tags: ['a'], Bio: '' })).toEqual({
      fields: [
        { label: 'Team', value: 'SRE' },
        { label: 'Bio', value: '' },
      ],
      preserved: { age: 3, tags: ['a'] },
    })
  })

  it('merges edited fields back over preserved values, trimmed', () => {
    expect(
      mergeDetails(
        [
          { label: ' Team ', value: ' Ops ' },
          { label: 'age', value: 'four' },
        ],
        { age: 3, x: null },
      ),
    ).toEqual({
      age: 'four',
      x: null,
      Team: 'Ops',
    })
  })

  it('formats non-text values', () => {
    expect(formatDetailValue(null)).toBe('null')
    expect(formatDetailValue({ a: 1 })).toBe('{"a":1}')
  })
})
