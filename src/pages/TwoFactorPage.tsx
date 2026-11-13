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

/** Two-factor sign-in page (/login/verify-2fa). */

import { Navigate, useLocation } from 'react-router-dom'
import { AuthLayout } from '@/components/templates/AuthLayout'
import { TwoFactorForm } from '@/components/organisms/TwoFactorForm'
import type { TwoFactorContext } from '@/features/auth/types'
import { ROUTES } from '@/constants/routes'

/**
 * Reads the 2FA challenge passed from the login page through router state.
 * Opening this URL directly (no state) redirects back to /login.
 */
export const TwoFactorPage = () => {
  const { state } = useLocation()
  const context = state as TwoFactorContext | null

  if (!context?.temporaryAuthToken) {
    return <Navigate to={ROUTES.login} replace />
  }

  return (
    <AuthLayout
      headline="One more step, then you're in."
      subtext="A second check keeps production safe, even if a password leaks."
    >
      <TwoFactorForm context={context} />
    </AuthLayout>
  )
}
