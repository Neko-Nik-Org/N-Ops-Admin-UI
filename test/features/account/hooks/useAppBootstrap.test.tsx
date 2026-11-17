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
/** Tests for src/features/account/hooks/useAppBootstrap.ts. */

import { screen, waitFor } from '@testing-library/react'
import { ToastContainer } from 'react-toastify'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useAppBootstrap } from '@/features/account/hooks/useAppBootstrap'
import { currentUserAtom, sessionStatusAtom } from '@/features/auth/store/session'
import { api, makeUser, renderHookWithProviders } from '../../../testUtils'

const rawProfile = {
  user_id: 1,
  organization_id: 'org-1',
  user_name: 'priya',
  display_name: 'Priya Rao',
  organization_name: 'Acme',
  primary_email: 'priya@acme.dev',
  is_email_verified: true,
  is_user_active: true,
  is_organization_active: true,
  permissions: ['tag:create', 'user:role:view'],
  tags: [2],
  allowed_linux_users: ['deploy'],
  can_approve_approvals: true,
  can_bypass_approvals: false,
}

/** Answers /user/self/profile with `profile`, everything else with {}. */
const serve = (profile: unknown) =>
  api.get.mockImplementation(async (url: string) => ({ data: url === '/user/self/profile' ? profile : {} }))

describe('useAppBootstrap', () => {
  it('lists the session check and the health check while the session is being checked', async () => {
    api.get.mockReturnValue(new Promise(() => {}))
    const { result } = renderHookWithProviders(() => useAppBootstrap('checking'))
    expect(result.current.pendingLabels).toEqual(['Checking your session', 'Checking N-Ops services'])
    expect(result.current.ready).toBe(false)
  })

  it('counts each finished step towards progress, and is ready once all seven are done', async () => {
    let finishTags: (value: { data: unknown[] }) => void = () => {}
    api.get.mockImplementation((url: string) =>
      url === '/tag/list' ? new Promise((resolve) => (finishTags = resolve)) : Promise.resolve({ data: {} }),
    )
    const { result } = renderHookWithProviders(() => useAppBootstrap('authenticated'))
    await waitFor(() => expect(result.current.pendingLabels).toEqual(['Loading your tags']))
    expect(result.current.progress).toBeCloseTo(6 / 7)
    expect(result.current.ready).toBe(false)

    finishTags({ data: [] })
    await waitFor(() => expect(result.current.ready).toBe(true))
    expect(result.current.progress).toBe(1)
  })

  it('replaces the profile saved at sign-in with the fresh one, including the role scope', async () => {
    serve(rawProfile)
    const { result, store } = renderHookWithProviders(() => useAppBootstrap('authenticated'), {
      user: makeUser({ permissions: ['tag:create'], tags: [] }),
    })
    await waitFor(() => expect(result.current.ready).toBe(true))
    await waitFor(() =>
      expect(store.get(currentUserAtom)).toMatchObject({
        permissions: ['tag:create', 'user:role:view'],
        tags: [2],
        allowedLinuxUsers: ['deploy'],
        canApproveApprovals: true,
        canBypassApprovals: false,
      }),
    )
    expect(api.get).toHaveBeenCalledWith('/user/self/profile')
  })

  it('keeps the saved profile when the profile request fails', async () => {
    api.get.mockImplementation(async (url: string) => {
      if (url === '/user/self/profile') throw new Error('boom')
      return { data: {} }
    })
    const saved = makeUser()
    const { result, store } = renderHookWithProviders(() => useAppBootstrap('authenticated'), { user: saved })
    await waitFor(() => expect(result.current.ready).toBe(true))
    expect(store.get(currentUserAtom)).toEqual(saved)
  })

  it.each([
    ['user', { is_user_active: false }, 'Your account has been deactivated.'],
    ['organization', { is_organization_active: false }, 'Your organization has been deactivated.'],
  ])('signs out with a message when the %s is deactivated', async (_label, flags, message) => {
    serve({ ...rawProfile, ...flags })
    const { store } = renderHookWithProviders(() => useAppBootstrap('authenticated'), { user: makeUser() })
    render(<ToastContainer />)
    expect(await screen.findByText(new RegExp(message))).toBeInTheDocument()
    expect(store.get(sessionStatusAtom)).toBe('unauthenticated')
    expect(store.get(currentUserAtom)).toBeNull()
  })
})
