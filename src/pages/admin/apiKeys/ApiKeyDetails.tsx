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
/** An API key, read-only: status, role, scope and dates. Also holds the bits the key pages share. */

import { CalendarClock, FolderLock, KeyRound, ShieldCheck } from 'lucide-react'
import moment from 'moment'
import type { ReactNode } from 'react'
import { Badge } from '@/components/Badge'
import { useRoleOptions } from '@/hooks/useRoles'
import { useTagOptions } from '@/hooks/useTagOptions'
import { useVaultProjects } from '@/hooks/useVault'
import { type ApiKey } from '@/types/apiKey'
import { formatDate, formatDateTime, formatRelative } from '@/utils/format'

/** Active, disabled, expired, or expiring within 14 days. */
export const KeyStatus = ({ apiKey }: { apiKey: ApiKey }) => {
  if (!apiKey.isActive) return <Badge>Disabled</Badge>
  if (apiKey.expiresAt && moment(apiKey.expiresAt).isBefore()) return <Badge tone="danger">Expired</Badge>
  if (apiKey.expiresAt && moment(apiKey.expiresAt).diff(moment(), 'days') < 14)
    return <Badge tone="warning">Expires {formatRelative(apiKey.expiresAt)}</Badge>
  return <Badge tone="signal">Active</Badge>
}

/** The delete confirmation's text. */
export const ApiKeyDeleteImpact = ({ apiKey }: { apiKey: ApiKey }) => (
  <p>
    Delete <span className="font-medium text-text">{apiKey.keyName}</span>? Anything using it stops working immediately. To pause
    it instead, edit the key and turn off Active.
  </p>
)

/** Vault project names by id; falls back to "#id". */
export const useProjectName = () => {
  const { data: projects } = useVaultProjects()
  return (id: number) => projects?.find((p) => p.projectId === id)?.projectName ?? `#${id}`
}

/** One at-a-glance figure. */
const Tile = ({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) => (
  <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-raised p-4">
    <span
      className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-signal/10 text-signal"
      aria-hidden="true"
    >
      {icon}
    </span>
    <div className="flex min-w-0 flex-col gap-1">
      <p className="text-xs tracking-wide text-text-muted uppercase">{label}</p>
      <div className="flex min-w-0 flex-wrap gap-1 text-sm text-text">{children}</div>
    </div>
  </div>
)

export const ApiKeyDetails = ({ apiKey }: { apiKey: ApiKey }) => {
  const { roleName } = useRoleOptions()
  const { tagName } = useTagOptions()
  const projectName = useProjectName()

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile icon={<KeyRound size={17} />} label="Status">
          <KeyStatus apiKey={apiKey} />
        </Tile>
        <Tile icon={<ShieldCheck size={17} />} label="Role">
          {roleName(apiKey.roleId)}
        </Tile>
        <Tile icon={<FolderLock size={17} />} label="Scope">
          <Badge tone="accent" mono>
            {tagName(apiKey.tagId)}
          </Badge>
          {apiKey.vaultProjectIds.length ? (
            apiKey.vaultProjectIds.map((id) => (
              <Badge key={id} mono>
                {projectName(id)}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-warning">No vault projects</span>
          )}
        </Tile>
        <Tile icon={<CalendarClock size={17} />} label="Expires">
          {apiKey.expiresAt ? formatDate(apiKey.expiresAt) : 'Never'}
        </Tile>
      </div>

      <section className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-surface-raised p-5">
        <h2 className="text-sm font-semibold text-text">Details</h2>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm">
          <dt className="text-text-muted">Key starts with</dt>
          <dd className="font-mono text-text">{apiKey.keyPrefix}…</dd>
          <dt className="text-text-muted">Last used</dt>
          <dd className="text-text" title={apiKey.lastUsedAt ? formatDateTime(apiKey.lastUsedAt) : undefined}>
            {formatRelative(apiKey.lastUsedAt)}
          </dd>
          <dt className="text-text-muted">Created</dt>
          <dd className="text-text">{formatDateTime(apiKey.createdAt)}</dd>
          <dt className="text-text-muted">Updated</dt>
          <dd className="text-text">{formatDateTime(apiKey.updatedAt)}</dd>
        </dl>
      </section>
    </div>
  )
}
