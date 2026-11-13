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

/** Two-factor verification hook used by the 2FA form. */

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
