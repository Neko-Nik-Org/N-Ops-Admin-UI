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
/** Admin › API keys (/admin/api-keys): keys for scripts and pipelines, each acting with an existing role. */

import { KeyRound, Pencil, Plus, Trash2 } from 'lucide-react'
import moment from 'moment'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/atoms/Badge'
import { LoadingButton } from '@/components/molecules/LoadingButton'
import { TableSkeleton } from '@/components/molecules/Skeleton'
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog'
import { PageHeader } from '@/components/molecules/PageHeader'
import { SearchInput } from '@/components/molecules/SearchInput'
import { ApiKeyFormDialog } from '@/components/organisms/ApiKeyFormDialog'
import { useApiKeys, useDeleteApiKey, useRoleOptions } from '@/features/admin/hooks/useAdmin'
import { useTagOptions } from '@/features/admin/hooks/useTagOptions'
import { useVaultProjects } from '@/features/vault/hooks/useVault'
import type { ApiKey } from '@/features/admin/types'
import { formatDate, formatRelative } from '@/utils/format'

/** Which dialog is open, and for which key. */
type DialogState = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; apiKey: ApiKey } | { kind: 'delete'; apiKey: ApiKey }

/** Active, disabled, expired, or expiring within 14 days. */
const KeyStatus = ({ apiKey }: { apiKey: ApiKey }) => {
  if (!apiKey.isActive) return <Badge>Disabled</Badge>
  if (apiKey.expiresAt && moment(apiKey.expiresAt).isBefore()) return <Badge tone="danger">Expired</Badge>
  if (apiKey.expiresAt && moment(apiKey.expiresAt).diff(moment(), 'days') < 14)
    return <Badge tone="warning">Expires {formatRelative(apiKey.expiresAt)}</Badge>
  return <Badge tone="signal">Active</Badge>
}

/** API keys table. */
export const AdminApiKeysPage = () => {
  const { data: keys, isLoading, error } = useApiKeys()
  const { roleName } = useRoleOptions()
  const { tagName } = useTagOptions()
  const { data: projects } = useVaultProjects()
  const projectName = (id: number) => projects?.find((p) => p.projectId === id)?.projectName ?? `#${id}`
  const { mutateAsync: remove } = useDeleteApiKey()
  const [dialog, setDialog] = useState<DialogState>({ kind: 'closed' })
  const [search, setSearch] = useState('')
  const close = () => setDialog({ kind: 'closed' })

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (keys ?? []).filter((k) => !q || `${k.keyName} ${k.keyDescription} ${k.keyPrefix}`.toLowerCase().includes(q))
  }, [keys, search])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="API keys"
        mock
        actions={
          <LoadingButton icon={<Plus size={15} />} onClick={() => setDialog({ kind: 'create' })}>
            New API key
          </LoadingButton>
        }
      />

      {isLoading ? (
        <TableSkeleton rows={4} columns={5} />
      ) : error ? (
        <p className="text-sm text-text-muted">Couldn't load API keys: {error.message}</p>
      ) : (
        <section className="rounded-xl border border-border bg-surface-raised p-5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search keys" className="mb-4 max-w-md" />
          {!visible.length ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <KeyRound size={22} className="text-text-muted" aria-hidden="true" />
              <p className="text-sm text-text-muted">{keys?.length ? 'No keys match.' : 'No API keys yet.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[51.25rem] border-collapse text-left">
                <thead>
                  <tr className="text-xs tracking-wide text-text-muted uppercase">
                    <th className="pb-2 font-medium">Key</th>
                    <th className="pb-2 font-medium">Role</th>
                    <th className="pb-2 font-medium">Scope</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Last used</th>
                    <th className="pb-2 font-medium">Expires</th>
                    <th className="pb-2 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((key) => (
                    <tr key={key.apiKeyId} className="border-t border-border align-top">
                      <td className="max-w-xs py-3">
                        <p className="text-sm font-medium text-text">{key.keyName}</p>
                        <p className="font-mono text-xs text-text-muted">{key.keyPrefix}…</p>
                        <p className="mt-0.5 text-xs text-text-muted">{key.keyDescription}</p>
                      </td>
                      <td className="py-3 text-sm text-text">{roleName(key.roleId)}</td>
                      <td className="py-3">
                        <div className="flex max-w-56 flex-wrap gap-1">
                          <Badge tone="accent" mono>
                            {tagName(key.tagId)}
                          </Badge>
                          {key.vaultProjectIds.length ? (
                            key.vaultProjectIds.map((id) => (
                              <Badge key={id} tone="neutral" mono>
                                {projectName(id)}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-warning">No vault projects</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <KeyStatus apiKey={key} />
                      </td>
                      <td className="py-3 text-sm text-text-muted">{formatRelative(key.lastUsedAt)}</td>
                      <td className="py-3 text-sm text-text-muted">{key.expiresAt ? formatDate(key.expiresAt) : 'Never'}</td>
                      <td className="py-3">
                        <div className="flex justify-end gap-1">
                          <LoadingButton
                            variant="ghost"
                            size="sm"
                            icon={<Pencil size={14} />}
                            aria-label={`Edit ${key.keyName}`}
                            onClick={() => setDialog({ kind: 'edit', apiKey: key })}
                          />
                          <LoadingButton
                            variant="ghost"
                            size="sm"
                            icon={<Trash2 size={14} />}
                            aria-label={`Delete ${key.keyName}`}
                            onClick={() => setDialog({ kind: 'delete', apiKey: key })}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <ApiKeyFormDialog
        open={dialog.kind === 'create' || dialog.kind === 'edit'}
        apiKey={dialog.kind === 'edit' ? dialog.apiKey : undefined}
        onClose={close}
      />
      <ConfirmDialog
        open={dialog.kind === 'delete'}
        title="Delete API key"
        confirmLabel="Delete key"
        successMessage={dialog.kind === 'delete' ? `Deleted ${dialog.apiKey.keyName}.` : ''}
        onConfirm={() => (dialog.kind === 'delete' ? remove(dialog.apiKey.apiKeyId) : Promise.resolve())}
        onClose={close}
      >
        {dialog.kind === 'delete' && (
          <p>
            Delete <span className="font-medium text-text">{dialog.apiKey.keyName}</span>? Anything using it stops working
            immediately. To pause it instead, edit the key and turn off Active.
          </p>
        )}
      </ConfirmDialog>
    </div>
  )
}
