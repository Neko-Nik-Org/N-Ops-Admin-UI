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
/** Types for access restriction policies (`/policy/access-restriction/*`). */

/**
 * An access restriction policy (`access_restriction_policy`): sign-in rules a user can be given —
 * required second factors, and the IP ranges or countries they may sign in from.
 */
export interface AccessPolicy {
  policyId: number
  policyName: string
  policyDescription: string
  /** Users with this policy must set up an authenticator app (TOTP). */
  enforceTotp2fa: boolean
  /** Users with this policy must set up email codes. */
  enforceEmail2fa: boolean
  /** Users with this policy may link the N-Ops mobile app (long-lived device sessions). */
  allowDeviceLogins: boolean
  hasIpRestriction: boolean
  /** IPv4 addresses or CIDR ranges. */
  allowedIps: string[]
  hasGeoRestriction: boolean
  /** Two-letter country codes, e.g. "IN". */
  allowedGeoLocations: string[]
}

/** Fields set when creating or editing an access policy. */
export type AccessPolicyInput = Omit<AccessPolicy, 'policyId'>
