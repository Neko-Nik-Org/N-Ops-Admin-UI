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
/** Tests for src/routes/guards.tsx: who may see signed-in and signed-out pages. */

import { act, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RequireAuth, RequireGuest } from '@/routes/guards'
import { sessionStatusAtom } from '@/store/session'
import { useTags } from '@/hooks/useTags'
import { api, makeUser, renderWithProviders } from '../testUtils'

describe('RequireAuth', () => {
  it('shows a loader while the saved session is being checked', async () => {
    renderWithProviders(<RequireAuth>secret dashboard</RequireAuth>, { route: '/tags' })
    expect(await screen.findByText('Checking your session')).toBeInTheDocument()
    expect(screen.queryByText('secret dashboard')).not.toBeInTheDocument()
  })

  it('sends signed-out users to /login', () => {
    const { store } = renderWithProviders(<RequireAuth>secret dashboard</RequireAuth>, { route: '/tags' })
    act(() => store.set(sessionStatusAtom, 'unauthenticated'))
    expect(screen.getByTestId('location')).toHaveTextContent('/login')
    expect(screen.queryByText('secret dashboard')).not.toBeInTheDocument()
  })

  it('renders the page for signed-in users once every startup request has finished', async () => {
    api.get.mockResolvedValue({ data: {} })
    renderWithProviders(<RequireAuth>secret dashboard</RequireAuth>, { route: '/tags', user: makeUser() })
    expect(screen.getByText('Checking N-Ops services')).toBeInTheDocument()
    expect(screen.queryByText('secret dashboard')).not.toBeInTheDocument()
    expect(await screen.findByText('secret dashboard')).toBeInTheDocument()
    for (const url of [
      '/health/service',
      '/user/self/profile',
      '/user/self/ui-info',
      '/user/self/details',
      '/user/self/org-info',
      '/tag/list',
    ]) {
      expect(api.get).toHaveBeenCalledWith(url)
    }
  })

  it('checks service health during the session check, before anything that needs sign-in', async () => {
    api.get.mockReturnValue(new Promise(() => {}))
    renderWithProviders(<RequireAuth>secret dashboard</RequireAuth>, { route: '/tags' })
    expect(await screen.findByText('Checking your session')).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/health/service')
    expect(api.get).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })

  it('keeps the page up when it refetches a startup query that failed', async () => {
    let tagCalls = 0
    api.get.mockImplementation(async (url: string) => {
      if (url === '/tag/list') {
        tagCalls++
        throw new Error('SQL Database error')
      }
      return { data: {} }
    })
    const RefetchesTags = () => {
      useTags()
      return <>secret dashboard</>
    }
    renderWithProviders(
      <RequireAuth>
        <RefetchesTags />
      </RequireAuth>,
      { route: '/tags', user: makeUser() },
    )
    expect(await screen.findByText('secret dashboard')).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(screen.getByText('secret dashboard')).toBeInTheDocument()
    expect(tagCalls).toBeLessThanOrEqual(2) // the startup call, plus at most one refetch on mount
  })

  it('still opens the app when some startup requests fail', async () => {
    api.get.mockImplementation(async (url: string) => {
      if (url === '/health/service' || url === '/tag/list') throw new Error('boom')
      return { data: {} }
    })
    renderWithProviders(<RequireAuth>secret dashboard</RequireAuth>, { route: '/tags', user: makeUser() })
    expect(await screen.findByText('secret dashboard')).toBeInTheDocument()
  })
})

describe('RequireGuest', () => {
  it('renders sign-in pages for signed-out users', () => {
    const { store } = renderWithProviders(<RequireGuest>login form</RequireGuest>, { route: '/login' })
    act(() => store.set(sessionStatusAtom, 'unauthenticated'))
    expect(screen.getByText('login form')).toBeInTheDocument()
  })

  it('sends signed-in users to the dashboard', () => {
    renderWithProviders(<RequireGuest>login form</RequireGuest>, { route: '/login', user: makeUser() })
    expect(screen.getByTestId('location')).toHaveTextContent('/')
    expect(screen.queryByText('login form')).not.toBeInTheDocument()
  })
})
