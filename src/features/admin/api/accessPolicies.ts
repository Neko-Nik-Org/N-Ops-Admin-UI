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
 * API calls for access restriction policies (`/policy/access-restriction/*`). A policy holds the
 * sign-in rules for the users it is given: required 2FA methods plus allowed IP ranges and countries.
 * Like roles, the API splits a policy into its info (name, description) and its rules.
 */

import { apiClient } from '@/lib/axios'
import type { AccessPolicy, AccessPolicyInput } from '../types'

const BASE = '/policy/access-restriction'

/** Policy as sent by the API (`PolicyInfo` in the Main API). */
interface RawAccessPolicy {
  policy_id: number
  policy_name: string
  policy_description: string
  enforce_totp_2fa: boolean
  enforce_email_2fa: boolean
  has_ip_restriction: boolean
  has_geo_restriction: boolean
  allowed_ips: string[] | null
  allowed_geo_locations: string[] | null
}

/** Maps an API policy to the app's camelCase AccessPolicy. */
const toPolicy = (p: RawAccessPolicy): AccessPolicy => ({
  policyId: p.policy_id,
  policyName: p.policy_name,
  policyDescription: p.policy_description,
  enforceTotp2fa: p.enforce_totp_2fa,
  enforceEmail2fa: p.enforce_email_2fa,
  hasIpRestriction: p.has_ip_restriction,
  allowedIps: p.allowed_ips ?? [],
  hasGeoRestriction: p.has_geo_restriction,
  allowedGeoLocations: p.allowed_geo_locations ?? [],
})

/**
 * The rules half of a policy, as the create and PATCH endpoints take it. A list whose restriction is
 * off is sent empty, so a switched-off rule doesn't keep stale addresses around.
 */
const toRawRules = (input: AccessPolicyInput) => ({
  enforce_totp_2fa: input.enforceTotp2fa,
  enforce_email_2fa: input.enforceEmail2fa,
  set_ip_restriction: input.hasIpRestriction,
  set_geo_restriction: input.hasGeoRestriction,
  allowed_ips: input.hasIpRestriction ? input.allowedIps : [],
  allowed_geo_locations: input.hasGeoRestriction ? input.allowedGeoLocations : [],
})

/** Policies fetched per request when listing every policy. */
export const POLICY_PAGE_SIZE = 100

/** Options for one page of policies. */
export interface ListPoliciesParams {
  /** Case-insensitive match on the policy name. */
  search?: string
  limit?: number
  offset?: number
}

/** `GET /policy/access-restriction/list` — one page of policies. Requires `policy:ar:view`. */
export const listAccessPoliciesPage = async ({ search, limit = POLICY_PAGE_SIZE, offset = 0 }: ListPoliciesParams = {}): Promise<
  AccessPolicy[]
> => {
  const params: Record<string, string | number> = { limit, offset }
  if (search?.trim()) params.policy_name = search.trim()
  const { data } = await apiClient.get<RawAccessPolicy[]>(`${BASE}/list`, { params })
  return data.map(toPolicy)
}

/** Every policy in the organization (pages through `/list`). */
export const listAccessPolicies = async (): Promise<AccessPolicy[]> => {
  const policies: AccessPolicy[] = []
  for (;;) {
    const page = await listAccessPoliciesPage({ offset: policies.length })
    policies.push(...page)
    if (page.length < POLICY_PAGE_SIZE) return policies
  }
}

/** `GET /policy/access-restriction/get/{id}` — requires `policy:ar:view`. The API answers 404 for an unknown id. */
export const fetchAccessPolicy = async (policyId: number): Promise<AccessPolicy> => {
  const { data } = await apiClient.get<RawAccessPolicy>(`${BASE}/get/${policyId}`)
  return toPolicy(data)
}

/** `POST /policy/access-restriction/create` — requires `policy:ar:view` + `policy:ar:create`. Responds 201 with no body. */
export const createAccessPolicy = async (input: AccessPolicyInput): Promise<void> => {
  await apiClient.post(`${BASE}/create`, {
    policy_name: input.policyName,
    description: input.policyDescription,
    ...toRawRules(input),
  })
}

/** `PUT /policy/access-restriction/update/{id}` — renames / re-describes a policy. Requires `policy:ar:view` + `policy:ar:edit`. */
export const updateAccessPolicyInfo = async (
  policyId: number,
  input: Pick<AccessPolicyInput, 'policyName' | 'policyDescription'>,
): Promise<void> => {
  await apiClient.put(`${BASE}/update/${policyId}`, {
    policy_name: input.policyName,
    description: input.policyDescription,
  })
}

/**
 * `PATCH /policy/access-restriction/update/{id}` — replaces the policy's 2FA and IP / country rules.
 * Requires `policy:ar:view` + `policy:ar:edit`.
 */
export const updateAccessPolicyRules = async (policyId: number, input: AccessPolicyInput): Promise<void> => {
  await apiClient.patch(`${BASE}/update/${policyId}`, toRawRules(input))
}

const sameSet = <T>(a: readonly T[], b: readonly T[]) => a.length === b.length && a.every((x) => b.includes(x))

/** Whether saving `input` over `policy` changes its name or description. */
const infoChanged = (policy: AccessPolicy, input: AccessPolicyInput) =>
  policy.policyName !== input.policyName || policy.policyDescription !== input.policyDescription

/** Whether saving `input` over `policy` changes anything the PATCH endpoint covers. */
const rulesChanged = (policy: AccessPolicy, input: AccessPolicyInput) => {
  const before = toRawRules(policy)
  const after = toRawRules(input)
  return (
    before.enforce_totp_2fa !== after.enforce_totp_2fa ||
    before.enforce_email_2fa !== after.enforce_email_2fa ||
    before.set_ip_restriction !== after.set_ip_restriction ||
    before.set_geo_restriction !== after.set_geo_restriction ||
    !sameSet(before.allowed_ips, after.allowed_ips) ||
    !sameSet(before.allowed_geo_locations, after.allowed_geo_locations)
  )
}

/**
 * Saves an edited policy, calling only the endpoint(s) whose fields changed: rules first, so a
 * rejected rule change leaves the name untouched too.
 */
export const updateAccessPolicy = async (policy: AccessPolicy, input: AccessPolicyInput): Promise<void> => {
  if (rulesChanged(policy, input)) await updateAccessPolicyRules(policy.policyId, input)
  if (infoChanged(policy, input)) await updateAccessPolicyInfo(policy.policyId, input)
}

/** `GET /policy/access-restriction/check/{id}` — how many users have this policy. Requires `policy:ar:view`. */
export const countAccessPolicyUsers = async (policyId: number): Promise<number> => {
  const { data } = await apiClient.get<number>(`${BASE}/check/${policyId}`)
  return Number(data)
}

/**
 * `DELETE /policy/access-restriction/delete/{id}` — requires `policy:ar:view` + `policy:ar:delete`.
 * Users who had the policy are left with none (the database sets their policy to NULL).
 */
export const deleteAccessPolicy = async (policyId: number): Promise<void> => {
  await apiClient.delete(`${BASE}/delete/${policyId}`)
}
