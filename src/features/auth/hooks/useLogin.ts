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
