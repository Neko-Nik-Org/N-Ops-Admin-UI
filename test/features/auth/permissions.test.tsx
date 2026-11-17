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
import { isRoleWithinScope, isWithinLimit, useHasPermissions, useHasTagAccess } from '@/features/auth/permissions'
import { makeUser, renderHookWithProviders } from '../../testUtils'

describe('useHasPermissions', () => {
  it('allows everything when the profile is unknown (the API has the final say)', () => {
    const { result } = renderHookWithProviders(() => useHasPermissions('tag:delete'))
    expect(result.current).toBe(true)
  })

  it('requires every listed permission', () => {
    const user = makeUser({ permissions: ['tag:create', 'tag:edit'] })
    expect(renderHookWithProviders(() => useHasPermissions('tag:create', 'tag:edit'), { user }).result.current).toBe(true)
    expect(renderHookWithProviders(() => useHasPermissions('tag:create', 'tag:delete'), { user }).result.current).toBe(false)
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

describe('isRoleWithinScope', () => {
  const role = { permissions: ['tag:create'], tagIds: [1] }

  it('allows any role when the profile is unknown', () => {
    expect(isRoleWithinScope(null, { permissions: ['x'], tagIds: [] })).toBe(true)
  })

  it('needs every role permission to be one the user holds', () => {
    expect(isRoleWithinScope(makeUser(), role)).toBe(true)
    expect(isRoleWithinScope(makeUser(), { ...role, permissions: ['tag:create', 'user:role:delete'] })).toBe(false)
  })

  it('lets an unrestricted user grant any tags, including all of them', () => {
    expect(isRoleWithinScope(makeUser({ tags: [] }), { ...role, tagIds: [] })).toBe(true)
  })

  it('keeps a tag-limited user to a non-empty subset of their tags', () => {
    const user = makeUser({ tags: [1, 2] })
    expect(isRoleWithinScope(user, { ...role, tagIds: [2] })).toBe(true)
    expect(isRoleWithinScope(user, { ...role, tagIds: [3] })).toBe(false)
    expect(isRoleWithinScope(user, { ...role, tagIds: [] })).toBe(false)
  })
})

describe('isWithinLimit', () => {
  it('treats an empty own list as no limit', () => {
    expect(isWithinLimit([], [])).toBe(true)
    expect(isWithinLimit([], ['root'])).toBe(true)
  })

  it('needs a non-empty subset when limited', () => {
    expect(isWithinLimit(['deploy', 'ubuntu'], ['deploy'])).toBe(true)
    expect(isWithinLimit(['deploy'], [])).toBe(false)
    expect(isWithinLimit(['deploy'], ['root'])).toBe(false)
  })
})

describe('isRoleWithinScope with the full profile', () => {
  const role = { permissions: ['tag:create'], tagIds: [], allowedLinuxUsers: ['deploy'] }

  it('skips Linux-user and approval checks until the profile has them', () => {
    expect(isRoleWithinScope(makeUser(), { ...role, allowedLinuxUsers: [], canBypassApprovals: true })).toBe(true)
  })

  it("keeps Linux users within the user's own", () => {
    const user = makeUser({ allowedLinuxUsers: ['deploy'], canApproveApprovals: false, canBypassApprovals: false })
    expect(isRoleWithinScope(user, role)).toBe(true)
    expect(isRoleWithinScope(user, { ...role, allowedLinuxUsers: [] })).toBe(false)
    expect(isRoleWithinScope(user, { ...role, allowedLinuxUsers: ['root'] })).toBe(false)
  })

  it('needs the approval flags the role grants', () => {
    const user = makeUser({ allowedLinuxUsers: [], canApproveApprovals: true, canBypassApprovals: false })
    expect(isRoleWithinScope(user, { ...role, canApproveApprovals: true })).toBe(true)
    expect(isRoleWithinScope(user, { ...role, canBypassApprovals: true })).toBe(false)
  })
})
