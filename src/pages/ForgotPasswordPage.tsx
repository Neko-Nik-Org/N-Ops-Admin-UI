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
/** Forgot-password page (/login/forgot-password). */

import { Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AuthCard, AuthShell } from '@/components/auth/AuthShell'
import { ROUTES } from '@/constants/routes'

/**
 * The API has no self-service password reset yet, so this says how to get one instead of
 * pretending to send an email. Swap in a reset form once the endpoint exists.
 */
export const ForgotPasswordPage = () => (
  <AuthShell>
    <AuthCard
      title="Reset your password"
      subtitle="Resetting by email isn't available on this server yet. An admin in your organization can reset your password for you."
      icon={<Lock size={26} />}
    >
      <Link to={ROUTES.login} replace className="n-btn n-btn--secondary n-btn--lg n-auth-submit n-auth-cta">
        Back to sign in
      </Link>
    </AuthCard>
  </AuthShell>
)
