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
 * An access policy, read-only: its 2FA requirements, allowed IPs and countries, and how many users
 * have it — at-a-glance tiles across the top, then a card per rule.
 */

import { Check, Globe, KeyRound, MapPin, Minus, Network, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '@/components/Badge'
import { countryName } from '@/constants/countries'
import { useAccessPolicyUserCount } from '@/hooks/useAccessPolicies'
import { type AccessPolicy } from '@/types/accessPolicy'
import { describeCidr } from '@/utils/cidr'
import { usersLabel } from '@/utils/format'

/** One at-a-glance figure. */
const Tile = ({ icon, label, value, note }: { icon: ReactNode; label: string; value: ReactNode; note?: ReactNode }) => (
  <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-raised p-4">
    <span
      className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-signal/10 text-signal"
      aria-hidden="true"
    >
      {icon}
    </span>
    <div className="min-w-0">
      <p className="text-xs tracking-wide text-text-muted uppercase">{label}</p>
      <p className="truncate text-lg font-semibold text-text">{value}</p>
      {note && <p className="truncate text-xs text-text-muted">{note}</p>}
    </div>
  </div>
)

const Card = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-surface-raised p-5">
    <h2 className="text-sm font-semibold text-text">{title}</h2>
    {children}
  </section>
)

/** "Required" / "Not required" line for one second factor. */
const Factor = ({ label, on, detail }: { label: string; on: boolean; detail: string }) => (
  <li className="flex items-start gap-3">
    <span
      className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${on ? 'bg-signal/15 text-signal' : 'bg-ink text-text-muted'}`}
      aria-hidden="true"
    >
      {on ? <Check size={13} /> : <Minus size={13} />}
    </span>
    <div>
      <p className="text-sm text-text">
        {label} <span className={on ? 'text-signal' : 'text-text-muted'}>· {on ? 'Required' : 'Not required'}</span>
      </p>
      <p className="text-xs text-text-muted">{detail}</p>
    </div>
  </li>
)

const Empty = ({ children }: { children: ReactNode }) => (
  <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-text-muted">{children}</p>
)

/** A policy's rules and how many users have it. */
export const AccessPolicyDetails = ({ policy }: { policy: AccessPolicy }) => {
  const { data: userCount } = useAccessPolicyUserCount(policy.policyId)
  const ips = policy.hasIpRestriction ? policy.allowedIps : []
  const countries = policy.hasGeoRestriction ? policy.allowedGeoLocations : []
  const factors = [policy.enforceTotp2fa && 'Authenticator app', policy.enforceEmail2fa && 'Email code'].filter(Boolean)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
          icon={<KeyRound size={18} />}
          label="Two-factor"
          value={factors.length ? `${factors.length} required` : 'Not required'}
          note={factors.length ? factors.join(' + ') : 'Password only'}
        />
        <Tile
          icon={<Network size={18} />}
          label="IP addresses"
          value={ips.length ? `${ips.length} allowed` : 'Any'}
          note={ips.length ? 'Sign-in only from these' : 'No IP limit'}
        />
        <Tile
          icon={<Globe size={18} />}
          label="Countries"
          value={countries.length ? `${countries.length} allowed` : 'Any'}
          note={countries.length ? countries.join(', ') : 'No country limit'}
        />
        <Tile
          icon={<Users size={18} />}
          label="Used by"
          value={userCount === undefined ? '…' : usersLabel(userCount)}
          note="Users who have this policy"
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <Card title="Two-factor sign-in">
          <ul className="flex flex-col gap-3">
            <Factor
              label="Authenticator app"
              on={policy.enforceTotp2fa}
              detail="A TOTP code from an app like Google Authenticator or 1Password."
            />
            <Factor label="Email code" on={policy.enforceEmail2fa} detail="A one-time code sent to their verified email." />
          </ul>
        </Card>

        <Card title="IP addresses">
          {ips.length ? (
            <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
              {ips.map((ip) => (
                <li key={ip} className="px-3 py-2">
                  <p className="font-mono text-sm text-text">{ip}</p>
                  <p className="font-mono text-xs text-text-muted">{describeCidr(ip)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Any IP address</Empty>
          )}
        </Card>

        <Card title="Countries">
          {countries.length ? (
            <ul className="flex flex-wrap gap-2">
              {countries.map((c) => (
                <li key={c}>
                  <Badge tone="accent">
                    <MapPin size={11} aria-hidden="true" className="mr-1 inline" />
                    {countryName(c)} ({c})
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Any country</Empty>
          )}
          {ips.length > 0 && countries.length > 0 && (
            <p className="text-xs text-text-muted">A sign-in must pass both the IP and the country check.</p>
          )}
        </Card>
      </div>
    </div>
  )
}

/** The delete confirmation's text, with how many users have the policy (from `/check/{id}`). */
export const AccessPolicyDeleteImpact = ({ policy }: { policy: AccessPolicy }) => {
  const { data: count, isPending, isError } = useAccessPolicyUserCount(policy.policyId)
  return (
    <div className="flex flex-col gap-2">
      <p>
        Delete <span className="font-medium text-text">{policy.policyName}</span>? This can't be undone.
      </p>
      {isPending ? (
        <p aria-busy="true">Checking who has this policy…</p>
      ) : isError ? (
        <p>Couldn't check who has this policy. Anyone who has it will be left with no access policy.</p>
      ) : count ? (
        <p className="text-warning">
          {usersLabel(count)} {count === 1 ? 'has' : 'have'} this policy. They'll be left with no access policy, so its 2FA and
          sign-in limits stop applying to them.
        </p>
      ) : (
        <p>No users have this policy.</p>
      )}
    </div>
  )
}

/** Shown on a disabled Edit button. */
export const NO_POLICY_EDIT =
  'Editing access policies needs the “Edit access policies” permission (policy:ar:edit), which your role doesn’t have.'
