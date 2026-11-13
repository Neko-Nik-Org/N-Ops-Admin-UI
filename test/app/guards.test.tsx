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
/** Tests for src/app/guards.tsx: who may see signed-in and signed-out pages. */

import { act, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RequireAuth, RequireGuest } from '@/app/guards'
import { sessionStatusAtom } from '@/features/auth/store/session'
import { makeUser, renderWithProviders } from '../testUtils'

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

  it('renders the page for signed-in users', () => {
    renderWithProviders(<RequireAuth>secret dashboard</RequireAuth>, { route: '/tags', user: makeUser() })
    expect(screen.getByText('secret dashboard')).toBeInTheDocument()
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
