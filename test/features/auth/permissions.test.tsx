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
/** Tests for src/features/auth/permissions.ts. */

import { describe, expect, it } from 'vitest'
import { useHasPermissions, useHasTagAccess } from '@/features/auth/permissions'
import { makeUser, renderHookWithProviders } from '../../testUtils'

describe('useHasPermissions', () => {
  it('allows everything when the profile is unknown (the API has the final say)', () => {
    const { result } = renderHookWithProviders(() => useHasPermissions('tag:delete'))
    expect(result.current).toBe(true)
  })

  it('requires every listed permission', () => {
    const user = makeUser({ permissions: ['tag:view', 'tag:create'] })
    expect(renderHookWithProviders(() => useHasPermissions('tag:view', 'tag:create'), { user }).result.current).toBe(true)
    expect(renderHookWithProviders(() => useHasPermissions('tag:view', 'tag:delete'), { user }).result.current).toBe(false)
  })
})

describe('useHasTagAccess', () => {
  it('grants every tag when the user has no tag restriction', () => {
    const { result } = renderHookWithProviders(() => useHasTagAccess(), { user: makeUser({ tags: [] }) })
    expect(result.current(42)).toBe(true)
  })

  it('limits access to the listed tags', () => {
    const { result } = renderHookWithProviders(() => useHasTagAccess(), { user: makeUser({ tags: [1, 2] }) })
    expect(result.current(1)).toBe(true)
    expect(result.current(3)).toBe(false)
  })
})
