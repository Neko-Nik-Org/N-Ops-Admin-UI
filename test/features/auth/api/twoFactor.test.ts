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
/** Tests for src/features/auth/api/twoFactor.ts. */

import { describe, expect, it } from 'vitest'
import { resendOtp, verifyOtp } from '@/features/auth/api/twoFactor'
import { api } from '../../../testUtils'

describe('two-factor api', () => {
  it('verifies a code against the temporary token', async () => {
    const session = { session_id: 's1' }
    api.post.mockResolvedValue({ data: session })
    await expect(verifyOtp('tmp-token', 'totp', '123456')).resolves.toBe(session)
    expect(api.post).toHaveBeenCalledWith('/auth/verify-otp', {
      temporary_auth_token: 'tmp-token',
      method: 'totp',
      otp: '123456',
    })
  })

  it('requests a new code for the chosen method', async () => {
    api.post.mockResolvedValue({ data: {} })
    await resendOtp('tmp-token', 'email')
    expect(api.post).toHaveBeenCalledWith('/auth/resend-otp', { temporary_auth_token: 'tmp-token', method: 'email' })
  })
})
