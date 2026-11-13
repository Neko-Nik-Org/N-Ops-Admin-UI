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

/** Sign-in hook used by the login form. */

import { useAsyncAction } from '@/components/loading'
import { login } from '../api/login'
import { useApplySession } from './useApplySession'
import type { LoginCredentials, LoginOutcome } from '../types'

/** Drives the sign-in LoadingButton: idle → loading → success. Caller navigates once `state` is 'success'. */
export const useLogin = () => {
  const applySession = useApplySession()

  return useAsyncAction(
    async ({
      credentials,
      turnstileToken,
    }: {
      credentials: LoginCredentials
      turnstileToken: string
    }): Promise<LoginOutcome> => {
      const response = await login(credentials, turnstileToken)

      /** Second factor needed: hand the challenge to the 2FA page instead of signing in. */
      if (response.is_2fa_required) {
        return {
          kind: 'two-factor',
          context: {
            temporaryAuthToken: response.temporary_auth_token,
            email: response.data.primary_email,
            organizationName: response.data.organization_name,
            hasTotp: response.data.has_totp_2fa,
            hasEmail: response.data.has_email_2fa,
            rememberMe: credentials.rememberMe,
          },
        }
      }

      applySession(response, credentials.rememberMe)
      return { kind: 'authenticated' }
    },
    { successMs: 600 },
  )
}
