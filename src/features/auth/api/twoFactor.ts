import { apiClient } from '@/lib/axios'
import type { LoginSuccessResponse, TwoFactorMethod } from '../types'

/**
 * `/auth/verify-otp` and `/auth/resend-otp` don't exist on N-Ops-Main-API yet — its `auth::verify_otp`
 * and `auth::resend_otp` routes are commented out in main.rs. These paths and shapes are this app's
 * best guess at the contract, kept here as the integration point to adjust once the backend lands.
 */

export const verifyOtp = async (
  temporaryAuthToken: string,
  method: TwoFactorMethod,
  code: string,
): Promise<LoginSuccessResponse> => {
  const { data } = await apiClient.post<LoginSuccessResponse>('/auth/verify-otp', {
    temporary_auth_token: temporaryAuthToken,
    method,
    otp: code,
  })
  return data
}

export const resendOtp = async (temporaryAuthToken: string, method: TwoFactorMethod): Promise<void> => {
  await apiClient.post('/auth/resend-otp', { temporary_auth_token: temporaryAuthToken, method })
}
