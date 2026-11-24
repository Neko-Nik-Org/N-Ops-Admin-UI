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
 * Admin › API keys (/admin/api-keys): keys for scripts and pipelines, each acting with an existing role.
 * Viewing, creating and editing a key each open their own page; deleting asks in a dialog.
 */

import { Eye, KeyRound, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge } from '@/components/Badge'
import { LoadingButton } from '@/components/LoadingButton'
import { TableSkeleton } from '@/components/Skeleton'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { PageHeader } from '@/components/PageHeader'
import { SearchInput } from '@/components/SearchInput'
import { ApiKeyDeleteImpact, KeyStatus, useProjectName } from '@/pages/admin/apiKeys/ApiKeyDetails'
import { apiKeyEditPath, apiKeyPath, ROUTES } from '@/constants/routes'
import { useApiKeys, useDeleteApiKey } from '@/hooks/useApiKeys'
import { useRoleOptions } from '@/hooks/useRoles'
import { useTagOptions } from '@/hooks/useTagOptions'
import { type ApiKey } from '@/types/apiKey'
import { formatDate, formatRelative } from '@/utils/format'

/** API keys table. */
export const AdminApiKeysPage = () => {
  const { data: keys, isLoading, error } = useApiKeys()
  const { roleName } = useRoleOptions()
  const { tagName } = useTagOptions()
  const projectName = useProjectName()
  const { mutateAsync: remove } = useDeleteApiKey()
  const [deleting, setDeleting] = useState<ApiKey | null>(null)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

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
          <LoadingButton icon={<Plus size={15} />} onClick={() => navigate(ROUTES.adminApiKeyNew)}>
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
                        <Link
                          to={apiKeyPath(key.apiKeyId)}
                          className="text-left text-sm font-medium text-text hover:text-signal hover:underline"
                        >
                          {key.keyName}
                        </Link>
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
                            icon={<Eye size={14} />}
                            aria-label={`View ${key.keyName}`}
                            title="View"
                            onClick={() => navigate(apiKeyPath(key.apiKeyId))}
                          />
                          <LoadingButton
                            variant="ghost"
                            size="sm"
                            icon={<Pencil size={14} />}
                            aria-label={`Edit ${key.keyName}`}
                            title="Edit"
                            onClick={() => navigate(apiKeyEditPath(key.apiKeyId))}
                          />
                          <LoadingButton
                            variant="ghost"
                            size="sm"
                            icon={<Trash2 size={14} />}
                            aria-label={`Delete ${key.keyName}`}
                            title="Delete"
                            onClick={() => setDeleting(key)}
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

      <ConfirmDialog
        open={deleting !== null}
        title="Delete API key"
        confirmLabel="Delete key"
        successMessage={deleting ? `Deleted ${deleting.keyName}.` : ''}
        onConfirm={() => (deleting ? remove(deleting.apiKeyId) : Promise.resolve())}
        onClose={() => setDeleting(null)}
      >
        {deleting && <ApiKeyDeleteImpact apiKey={deleting} />}
      </ConfirmDialog>
    </div>
  )
}
