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

/** Sign-in page (/login). */

import { AuthLayout } from '@/components/templates/AuthLayout'
import { LoginForm } from '@/components/organisms/LoginForm'

/** Sign-in heading and form inside the shared auth layout. */
export const LoginPage = () => (
  <AuthLayout>
    <div className="mb-8 flex flex-col gap-1.5">
      <h1 className="text-3xl font-bold text-text">Sign in</h1>
      <p className="text-sm text-text-muted">Welcome back. Sign in to manage your infrastructure.</p>
    </div>
    <LoginForm />
  </AuthLayout>
)
