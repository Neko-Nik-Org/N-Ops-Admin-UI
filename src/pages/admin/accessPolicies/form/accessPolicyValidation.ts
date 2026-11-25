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
/** Validation for the access policy form: name, 2FA, allowed IPs (addresses and CIDR ranges) and countries. */

import * as yup from 'yup'
import { isCountryCode } from '@/constants/countries'
import { checkCidr, isValidCidr, normalizeCidr } from '@/utils/cidr'

/** Most IP entries one policy can hold. */
export const MAX_POLICY_IPS = 100

/** One IP row of the policy form: an address or CIDR range (rows are objects for useFieldArray). */
const ipRow = yup.object({
  value: yup
    .string()
    .default('')
    .test('cidr', 'Enter an IP address or range.', function cidr(v) {
      if (!v?.trim()) return true // empty rows are dropped on save
      const check = checkCidr(v)
      return check.ok || this.createError({ message: check.error })
    }),
})

/**
 * The policy's IP limit, checked only while its switch is on: at least one entry (an empty list would
 * let everyone in), every entry a valid address or CIDR range, and no entry twice (compared after
 * normalizing, so 2001:db8:0::1 and 2001:db8::1 are the same).
 */
const allowedIpsField = yup
  .array(yup.object({ value: yup.string().default('') }))
  .default([])
  .when('hasIpRestriction', {
    is: true,
    then: (s) =>
      s
        .of(ipRow)
        .test('has-ips', 'Add at least one IP address or range.', (rows) => (rows ?? []).some((r) => r.value?.trim()))
        .test(
          'max-ips',
          `Add at most ${MAX_POLICY_IPS} entries.`,
          (rows) => (rows ?? []).filter((r) => r.value?.trim()).length <= MAX_POLICY_IPS,
        )
        .test('unique-ips', 'This one is already in the list.', function unique(rows) {
          const seen = new Set<string>()
          for (const [i, r] of (rows ?? []).entries()) {
            if (!r.value?.trim() || !isValidCidr(r.value)) continue
            const key = normalizeCidr(r.value)
            if (seen.has(key)) return this.createError({ path: `${this.path}[${i}].value` })
            seen.add(key)
          }
          return true
        }),
  })

/** Create / edit access policy form. */
export const accessPolicySchema = yup.object({
  policyName: yup.string().trim().required('Enter a policy name.').max(100, 'Keep it to 100 characters or fewer.'),
  policyDescription: yup.string().trim().default(''),
  enforceTotp2fa: yup.boolean().default(false),
  enforceEmail2fa: yup.boolean().default(false),
  allowDeviceLogins: yup.boolean().default(true),
  hasIpRestriction: yup.boolean().default(false),
  allowedIps: allowedIpsField,
  hasGeoRestriction: yup.boolean().default(false),
  // picked from the country list, so an array of codes rather than typed text
  allowedGeoLocations: yup
    .array(yup.string().required())
    .default([])
    .when('hasGeoRestriction', {
      is: true,
      then: (s) =>
        s
          .min(1, 'Pick at least one country.')
          .test('known-countries', 'Pick countries from the list.', (v) => (v ?? []).every(isCountryCode)),
    }),
})

export type AccessPolicyFormValues = yup.InferType<typeof accessPolicySchema>
