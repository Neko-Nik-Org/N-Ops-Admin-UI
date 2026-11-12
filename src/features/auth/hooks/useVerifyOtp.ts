import { useAsyncAction } from '@/components/loading'
import { verifyOtp } from '../api/twoFactor'
import { useApplySession } from './useApplySession'
import type { TwoFactorMethod } from '../types'

/** Drives the 2FA LoadingButton. The verify-otp endpoint isn't live on the backend yet (see api/twoFactor.ts). */
export const useVerifyOtp = () => {
  const applySession = useApplySession()

  return useAsyncAction(
    async ({
      temporaryAuthToken,
      method,
      code,
      rememberMe,
    }: {
      temporaryAuthToken: string
      method: TwoFactorMethod
      code: string
      rememberMe: boolean
    }) => {
      const response = await verifyOtp(temporaryAuthToken, method, code)
      applySession(response, rememberMe)
    },
    { successMs: 600 },
  )
}
