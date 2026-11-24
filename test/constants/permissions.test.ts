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

import { describe, expect, it } from 'vitest'
import { ALL_PERMISSIONS, PERMISSION_MATRIX, rowKeys } from '@/constants/permissions'

describe('PERMISSION_MATRIX', () => {
  it('lays out every permission exactly once', () => {
    const keys = PERMISSION_MATRIX.flatMap((s) => s.rows.flatMap(rowKeys))
    expect(new Set(keys).size).toBe(keys.length)
    expect([...keys].sort()).toEqual([...ALL_PERMISSIONS].sort())
  })
})
