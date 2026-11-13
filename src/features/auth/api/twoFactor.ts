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

/** Two-factor sign-in API calls (TOTP or emailed code). */

import { apiClient } from '@/lib/axios'
import type { LoginSuccessResponse, TwoFactorMethod } from '../types'

/**
 * `/auth/verify-otp` and `/auth/resend-otp` don't exist on N-Ops-Main-API yet — its `auth::verify_otp`
 * and `auth::resend_otp` routes are commented out in main.rs. These paths and shapes are this app's
 * best guess at the contract, kept here as the integration point to adjust once the backend lands.
 */

/** Exchanges the temporary token from the login step plus a one-time code for a full session. */
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

/** Asks the API to send a new code for the chosen method. */
export const resendOtp = async (temporaryAuthToken: string, method: TwoFactorMethod): Promise<void> => {
  await apiClient.post('/auth/resend-otp', { temporary_auth_token: temporaryAuthToken, method })
}
