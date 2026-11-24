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
/**
 * Second factors an access policy can require, and the setup steps a user must finish before using
 * the app. Sign-in reports `is_2fa_enforced` plus one `enforce_<factor>_2fa` / `has_<factor>_2fa`
 * pair per factor. To support a new factor (e.g. passkeys): add it to SECOND_FACTORS and
 * FACTOR_SETUP, and give its step a view on the setup page.
 */

/** Second factors the app knows. Keys match the API's `enforce_<key>_2fa` / `has_<key>_2fa` fields. */
export const SECOND_FACTORS = ['email', 'totp'] as const
export type SecondFactor = (typeof SECOND_FACTORS)[number]

/** What the user's access policy requires, and which of those factors they already have turned on. */
export interface SecurityRequirements {
  required: SecondFactor[]
  enabled: SecondFactor[]
}

/** One screen of the setup flow. */
export type SetupStepId = 'verify-email' | 'enable-email-2fa' | 'enable-totp-2fa'

/** What the setup checks need to know about the user. */
interface SetupUser {
  isEmailVerified: boolean
}

/** Per factor: steps that must come first, and the step that turns the factor on. */
const FACTOR_SETUP: Record<SecondFactor, { prerequisites: (user: SetupUser) => SetupStepId[]; step: SetupStepId }> = {
  // the API only turns on email codes for a verified address
  email: { prerequisites: (user) => (user.isEmailVerified ? [] : ['verify-email']), step: 'enable-email-2fa' },
  totp: { prerequisites: () => [], step: 'enable-totp-2fa' },
}

/**
 * Reads the policy part of a sign-in response (its `data`, plus the top-level `is_2fa_enforced`).
 * Returns null when nothing is required. `enabled` lists only factors the response says are on.
 */
export const readSecurityRequirements = (data: Record<string, unknown>): SecurityRequirements | null => {
  const required = SECOND_FACTORS.filter((f) => data[`enforce_${f}_2fa`] === true)
  if (!required.length) return null
  return { required, enabled: SECOND_FACTORS.filter((f) => data[`has_${f}_2fa`] === true) }
}

/** The steps still to do, in order, without repeats. Empty means the user may use the app. */
export const pendingSetupSteps = (requirements: SecurityRequirements | null, user: SetupUser | null): SetupStepId[] => {
  if (!requirements) return []
  const who = user ?? { isEmailVerified: false }
  const steps = requirements.required
    .filter((f) => !requirements.enabled.includes(f))
    .flatMap((f) => [...FACTOR_SETUP[f].prerequisites(who), FACTOR_SETUP[f].step])
  return [...new Set(steps)]
}

/** Type guard for a stored SecurityRequirements value. */
export const isSecurityRequirements = (value: unknown): value is SecurityRequirements => {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  const isFactorList = (list: unknown) =>
    Array.isArray(list) && list.every((f) => (SECOND_FACTORS as readonly unknown[]).includes(f))
  return isFactorList(v.required) && isFactorList(v.enabled)
}
