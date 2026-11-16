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

/** Sign-in API call. */

import { apiClient } from '@/lib/axios'
import { toBase64 } from '@/utils/base64'
import type { LoginCredentials, LoginResponse } from '../types'

/**
 * `POST /auth/login`. Sends the password base64-encoded and the Turnstile token as the
 * `cf-turnstile-token` header. Resolves to either a full session or a 2FA challenge.
 */
export const login = async (credentials: LoginCredentials, turnstileToken: string): Promise<LoginResponse> => {
  const { data } = await apiClient.post<LoginResponse>(
    '/auth/login',
    {
      user_name: credentials.userName,
      password: toBase64(credentials.password),
      remember_me: credentials.rememberMe,
    },
    {
      headers: {
        'cf-turnstile-token': turnstileToken,
      },
    },
  )
  return data
}
