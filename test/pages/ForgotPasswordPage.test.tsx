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
/** Tests for src/pages/ForgotPasswordPage.tsx. */

import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { renderWithProviders } from '../testUtils'

describe('ForgotPasswordPage', () => {
  it('explains that an admin resets passwords and links back to sign in', () => {
    renderWithProviders(<ForgotPasswordPage />, { route: '/login/forgot-password' })
    expect(screen.getByRole('heading', { name: 'Reset your password' })).toBeInTheDocument()
    expect(screen.getByText(/An admin in your organization can reset your password/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/login')
  })
})
