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
 * A user, read-only: contact, two-step verification, access policy, profile details and dates. Also
 * holds the bits the user pages share (avatar, policy lookup, confirmation texts).
 */

import { Clock, Lock, Mail, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '@/components/Badge'
import { ProfileDetailsView } from '@/components/ProfileDetailsView'
import { TwoFactorBadges } from '@/components/TwoFactorBadges'
import { countryName } from '@/constants/countries'
import { useAccessPolicies } from '@/hooks/useAccessPolicies'
import { useHasPermissions } from '@/hooks/usePermissions'
import { type AccessPolicy } from '@/types/accessPolicy'
import { type AdminUser } from '@/types/user'
import { cn } from '@/utils/cn'
import { formatDateTime, formatRelative } from '@/utils/format'

/** Shown on edit / delete controls for the signed-in user's own row. */
export const NOT_SELF = 'Use your Profile and Security pages (in the profile menu) to change your own account.'

/** Looks up access policies by id, for the table and details; names only ("Policy #id") without `policy:ar:view`. */
export const usePolicyLookup = () => {
  const canView = useHasPermissions('policy:ar:view')
  const { data: policies = [] } = useAccessPolicies({ enabled: canView })
  return (policyId: number | null): AccessPolicy | { policyId: number; policyName: string } | null =>
    policyId === null ? null : (policies.find((p) => p.policyId === policyId) ?? { policyId, policyName: `Policy #${policyId}` })
}

/** Initials for the avatar, e.g. "Priya Rao" → "PR". */
const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

export const Avatar = ({ name, large }: { name: string; large?: boolean }) => (
  <span
    className={cn(
      'flex shrink-0 items-center justify-center rounded-full bg-accent-secondary/15 font-semibold text-accent-secondary',
      large ? 'size-12 text-base' : 'size-8 text-xs',
    )}
    aria-hidden="true"
  >
    {initials(name)}
  </span>
)

/** Which second factors the user has set up. */
export const TwoFactor = ({ user }: { user: AdminUser }) => {
  const methods = [user.hasTotp2fa && 'App', user.hasEmail2fa && 'Email'].filter(Boolean)
  return methods.length ? <Badge tone="signal">{methods.join(' + ')}</Badge> : <Badge tone="warning">Off</Badge>
}

/** "Never" when the API's last sign-in is just the creation time (it can't be empty). */
export const lastSignIn = (u: AdminUser) =>
  !u.lastLoginAt || u.lastLoginAt === u.createdAt ? 'Never' : formatRelative(u.lastLoginAt)

/** The delete confirmation's text. */
export const UserDeleteImpact = ({ user }: { user: AdminUser }) => (
  <p>
    Permanently delete <span className="font-medium text-text">{user.displayName}</span> (@{user.userName})? Their notes and
    everything else they own go too. This can't be undone.
  </p>
)

/** The deactivate confirmation's text. */
export const UserDeactivateImpact = ({ user }: { user: AdminUser }) => (
  <p>
    <span className="font-medium text-text">{user.displayName}</span> won't be able to sign in. Their data is kept. There's no way
    to reactivate them from here yet.
  </p>
)

const Card = ({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) => (
  <section className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-surface-raised p-5">
    <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
      <span className="text-signal" aria-hidden="true">
        {icon}
      </span>
      {title}
    </h2>
    {children}
  </section>
)

const List = ({ items, empty }: { items: string[]; empty: string }) =>
  items.length ? (
    <ul className="flex flex-wrap gap-1">
      {items.map((i) => (
        <li key={i}>
          <Badge mono>{i}</Badge>
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-text-muted">{empty}</p>
  )

export const UserDetails = ({ user }: { user: AdminUser }) => {
  const policy = usePolicyLookup()(user.accessPolicyId)
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 xl:grid-cols-4">
        <Card icon={<Mail size={16} />} title="Contact">
          <p className="text-sm break-all text-text">{user.primaryEmail}</p>
          <p className="text-xs">
            {user.isEmailVerified ? <Badge tone="signal">Verified</Badge> : <Badge tone="warning">Not verified</Badge>}
          </p>
        </Card>

        <Card icon={<ShieldCheck size={16} />} title="Two-step verification">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-text-muted">Authenticator app</dt>
            <dd className="text-text">{user.hasTotp2fa ? 'On' : 'Off'}</dd>
            <dt className="text-text-muted">Email code</dt>
            <dd className="text-text">{user.hasEmail2fa ? 'On' : 'Off'}</dd>
          </dl>
        </Card>

        <Card icon={<Lock size={16} />} title="Access policy">
          {!policy ? (
            <p className="text-sm text-text-muted">None: no required 2FA, and they can sign in from anywhere.</p>
          ) : (
            <>
              <p className="text-sm font-medium text-text">{policy.policyName}</p>
              {'allowedIps' in policy && (
                <>
                  <div className="flex flex-wrap gap-1">
                    <TwoFactorBadges policy={policy} />
                  </div>
                  <p className="text-sm text-text">
                    IP addresses: {policy.hasIpRestriction && policy.allowedIps.length ? 'restricted' : 'any'}
                  </p>
                  {policy.hasIpRestriction && <List items={policy.allowedIps} empty="No addresses allowed." />}
                  <p className="text-sm text-text">
                    Countries: {policy.hasGeoRestriction && policy.allowedGeoLocations.length ? 'restricted' : 'any'}
                  </p>
                  {policy.hasGeoRestriction && (
                    <List
                      items={policy.allowedGeoLocations.map((c) => `${countryName(c)} (${c})`)}
                      empty="No countries allowed."
                    />
                  )}
                </>
              )}
            </>
          )}
        </Card>

        <Card icon={<Clock size={16} />} title="Activity">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-text-muted">Last sign-in</dt>
            <dd className="text-text" title={user.lastLoginAt ? formatDateTime(user.lastLoginAt) : undefined}>
              {lastSignIn(user)}
            </dd>
            <dt className="text-text-muted">Updated</dt>
            <dd className="text-text">{formatDateTime(user.updatedAt)}</dd>
            <dt className="text-text-muted">Joined</dt>
            <dd className="text-text">{formatDateTime(user.createdAt)}</dd>
          </dl>
        </Card>
      </div>

      {/* the person's own profile details (work, contact, availability, on call, engineering…) */}
      <section className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-surface-raised p-5">
        <h2 className="text-sm font-semibold text-text">Profile details</h2>
        {Object.keys(user.userDetails).length > 0 ? (
          <ProfileDetailsView raw={user.userDetails} />
        ) : (
          <p className="text-sm text-text-muted">None yet.</p>
        )}
      </section>
    </div>
  )
}
