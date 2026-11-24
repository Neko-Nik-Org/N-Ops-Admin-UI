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
/** Tests for src/features/auth/securitySetup.ts. */

import { describe, expect, it } from 'vitest'
import { isSecurityRequirements, pendingSetupSteps, readSecurityRequirements } from '@/features/auth/securitySetup'

const verified = { isEmailVerified: true }
const unverified = { isEmailVerified: false }

describe('readSecurityRequirements', () => {
  it('returns null when the policy requires nothing', () => {
    expect(readSecurityRequirements({ enforce_email_2fa: false, enforce_totp_2fa: false })).toBeNull()
    expect(readSecurityRequirements({})).toBeNull()
  })

  it('reads required and already-enabled factors', () => {
    expect(
      readSecurityRequirements({ enforce_email_2fa: true, enforce_totp_2fa: true, has_email_2fa: true, has_totp_2fa: false }),
    ).toEqual({ required: ['email', 'totp'], enabled: ['email'] })
  })
})

describe('pendingSetupSteps', () => {
  it('verifies the email before turning on email codes', () => {
    expect(pendingSetupSteps({ required: ['email'], enabled: [] }, unverified)).toEqual(['verify-email', 'enable-email-2fa'])
    expect(pendingSetupSteps({ required: ['email'], enabled: [] }, verified)).toEqual(['enable-email-2fa'])
  })

  it('needs only the authenticator step for TOTP', () => {
    expect(pendingSetupSteps({ required: ['totp'], enabled: [] }, unverified)).toEqual(['enable-totp-2fa'])
  })

  it('skips factors that are already on, and is empty when everything is', () => {
    expect(pendingSetupSteps({ required: ['email', 'totp'], enabled: ['email'] }, verified)).toEqual(['enable-totp-2fa'])
    expect(pendingSetupSteps({ required: ['email', 'totp'], enabled: ['email', 'totp'] }, verified)).toEqual([])
    expect(pendingSetupSteps(null, verified)).toEqual([])
  })

  it('treats an unknown user as unverified', () => {
    expect(pendingSetupSteps({ required: ['email'], enabled: [] }, null)).toEqual(['verify-email', 'enable-email-2fa'])
  })
})

describe('isSecurityRequirements', () => {
  it('accepts only known factors', () => {
    expect(isSecurityRequirements({ required: ['totp'], enabled: [] })).toBe(true)
    expect(isSecurityRequirements({ required: ['sms'], enabled: [] })).toBe(false)
    expect(isSecurityRequirements(null)).toBe(false)
  })
})
