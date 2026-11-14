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

import { AuthShell } from '@/components/auth/AuthShell'
import { LoginForm } from '@/components/organisms/LoginForm'

/** The sign-in card on the animated auth background. */
export const LoginPage = () => (
  <AuthShell>
    <LoginForm />
  </AuthShell>
)
