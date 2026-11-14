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
/** Vault › Keys store (/vault/keys): environment variables per service and tag, versioned. */

import { Download, Eye, EyeOff, History, KeyRound, PencilLine, Plus, Trash2, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { Badge } from '@/components/atoms/Badge'
import { LoadingButton, TableSkeleton } from '@/components/loading'
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog'
import { CopyButton } from '@/components/molecules/CopyButton'
import { PageHeader } from '@/components/molecules/PageHeader'
import { SearchInput } from '@/components/molecules/SearchInput'
import {
  ExportDotenvDialog,
  ImportDotenvDialog,
  SecretDialog,
  SecretHistoryDialog,
  type SecretDialogState,
} from '@/components/organisms/SecretDialogs'
import { VaultScopeBar } from '@/components/organisms/VaultScopeBar'
import { useTagOptions } from '@/features/admin/hooks/useTagOptions'
import { useSelectedTag } from '@/features/tags/hooks/useTags'
import { useDeleteSecret, useRevealSecret, useSecrets, useVaultScope } from '@/features/vault/hooks/useVault'
import type { SecretKey } from '@/features/vault/types'
import { formatDateTime, formatRelative } from '@/utils/format'

/** Keys table for the selected service, filtered by the top bar's tag. */
export const VaultKeysPage = () => {
  const scope = useVaultScope()
  const { service } = scope
  const { data: secrets, isLoading } = useSecrets(service?.serviceId ?? null)
  const { selectedTag } = useSelectedTag()
  const { tagName } = useTagOptions()
  const { mutateAsync: reveal } = useRevealSecret()
  const { mutateAsync: remove } = useDeleteSecret()
  const [search, setSearch] = useState('')
  const [revealed, setRevealed] = useState<Record<number, string>>({})
  const [dialog, setDialog] = useState<SecretDialogState>({ kind: 'closed' })
  const [history, setHistory] = useState<SecretKey | null>(null)
  const [deleting, setDeleting] = useState<SecretKey | null>(null)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const defaultTagId = selectedTag?.tagId ?? 0

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (secrets ?? [])
      .filter((s) => (!selectedTag || s.tagId === selectedTag.tagId) && (!q || s.name.toLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name) || tagName(a.tagId).localeCompare(tagName(b.tagId)))
  }, [secrets, selectedTag, search, tagName])

  /** Shows or hides a value; showing it fetches (and audits) the version in use. */
  const toggle = async (secret: SecretKey) => {
    if (revealed[secret.secretId] !== undefined) {
      setRevealed((r) => {
        const next = { ...r }
        delete next[secret.secretId]
        return next
      })
      return
    }
    try {
      const value = await reveal({ secretId: secret.secretId })
      setRevealed((r) => ({ ...r, [secret.secretId]: value }))
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Keys store"
        description="Environment variables and secrets, per service and tag. Every change is a new version; every read is audited."
        mock
        actions={
          service && (
            <>
              <LoadingButton variant="ghost" icon={<Upload size={14} />} onClick={() => setImporting(true)}>
                Import .env
              </LoadingButton>
              <LoadingButton
                variant="ghost"
                icon={<Download size={14} />}
                onClick={() => setExporting(true)}
                disabled={!secrets?.length}
              >
                Export
              </LoadingButton>
              <LoadingButton icon={<Plus size={15} />} onClick={() => setDialog({ kind: 'create' })}>
                New key
              </LoadingButton>
            </>
          )
        }
      />

      {scope.isLoading ? <TableSkeleton rows={2} columns={3} title={false} /> : <VaultScopeBar scope={scope} />}

      {!scope.isLoading && !service ? (
        <p className="py-10 text-center text-sm text-text-muted">
          {scope.project ? 'Add a service to this project to store keys.' : 'Create a project to get started.'}
        </p>
      ) : isLoading || scope.isLoading ? (
        <TableSkeleton rows={6} columns={4} />
      ) : (
        <section className="rounded-xl border border-border bg-surface-raised p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search keys" className="w-full max-w-sm" />
            <p className="text-sm text-text-muted">
              {selectedTag ? (
                <>
                  Showing{' '}
                  <Badge tone="accent" mono>
                    {selectedTag.tagName}
                  </Badge>{' '}
                  only. Change the tag in the top bar.
                </>
              ) : (
                'All tags. Pick a tag in the top bar to see one environment.'
              )}
            </p>
          </div>

          {!visible.length ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <KeyRound size={22} className="text-text-muted" aria-hidden="true" />
              <p className="text-sm text-text-muted">
                {secrets?.length ? 'No keys match.' : `No keys in ${service?.serviceName} yet. Add one or import a .env file.`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[47.5rem] border-collapse text-left">
                <thead>
                  <tr className="text-xs tracking-wide text-text-muted uppercase">
                    <th className="pb-2 font-medium">Key</th>
                    <th className="pb-2 font-medium">Tag</th>
                    <th className="pb-2 font-medium">Value</th>
                    <th className="pb-2 font-medium">Version</th>
                    <th className="pb-2 font-medium">Updated</th>
                    <th className="pb-2 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((s) => {
                    const value = revealed[s.secretId]
                    return (
                      <tr key={s.secretId} className="border-t border-border">
                        <td className="py-2.5 pr-3 font-mono text-sm font-medium text-text">{s.name}</td>
                        <td className="py-2.5 pr-3">
                          <Badge tone="accent" mono>
                            {tagName(s.tagId)}
                          </Badge>
                        </td>
                        <td className="max-w-72 py-2.5 pr-3">
                          <div className="flex items-center gap-1">
                            <code className="min-w-0 flex-1 truncate font-mono text-xs text-text" title={value}>
                              {value ?? '••••••••••••'}
                            </code>
                            <LoadingButton
                              variant="ghost"
                              size="sm"
                              icon={value !== undefined ? <EyeOff size={14} /> : <Eye size={14} />}
                              aria-label={`${value !== undefined ? 'Hide' : 'Reveal'} ${s.name}`}
                              onClick={() => toggle(s)}
                            />
                            <CopyButton
                              label={`Copy ${s.name}`}
                              getText={() => (value !== undefined ? Promise.resolve(value) : reveal({ secretId: s.secretId }))}
                            />
                          </div>
                        </td>
                        <td className="py-2.5 pr-3">
                          <span className="font-mono text-sm text-text">v{s.currentVersion}</span>
                          {s.currentVersion !== s.latestVersion && (
                            <Badge tone="warning" className="ml-1.5">
                              rolled back from v{s.latestVersion}
                            </Badge>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 text-sm text-text-muted" title={formatDateTime(s.updatedAt)}>
                          {formatRelative(s.updatedAt)} · {s.updatedBy}
                        </td>
                        <td className="py-2.5">
                          <div className="flex justify-end gap-1">
                            <LoadingButton
                              variant="ghost"
                              size="sm"
                              icon={<PencilLine size={14} />}
                              aria-label={`New version of ${s.name}`}
                              title="New version"
                              onClick={() => setDialog({ kind: 'version', secret: s })}
                            />
                            <LoadingButton
                              variant="ghost"
                              size="sm"
                              icon={<History size={14} />}
                              aria-label={`History of ${s.name}`}
                              title="History"
                              onClick={() => setHistory(s)}
                            />
                            <LoadingButton
                              variant="ghost"
                              size="sm"
                              icon={<Trash2 size={14} />}
                              aria-label={`Delete ${s.name}`}
                              title="Delete"
                              onClick={() => setDeleting(s)}
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <SecretDialog
        state={dialog}
        service={service}
        defaultTagId={defaultTagId}
        tagName={tagName}
        onClose={() => setDialog({ kind: 'closed' })}
      />
      <SecretHistoryDialog
        // keep the open dialog in step with fresh data (e.g. after a rollback)
        secret={history ? (secrets?.find((s) => s.secretId === history.secretId) ?? history) : null}
        tagName={tagName}
        onClose={() => setHistory(null)}
      />
      <ImportDotenvDialog
        open={importing}
        service={service}
        existing={secrets ?? []}
        defaultTagId={defaultTagId}
        onClose={() => setImporting(false)}
      />
      <ExportDotenvDialog
        open={exporting}
        service={service}
        defaultTagId={defaultTagId}
        tagName={tagName}
        onClose={() => setExporting(false)}
      />
      <ConfirmDialog
        open={!!deleting}
        title="Delete key"
        confirmLabel="Delete key"
        successMessage={`Deleted ${deleting?.name}.`}
        onConfirm={() => remove(deleting!.secretId)}
        onClose={() => setDeleting(null)}
      >
        <p>
          Delete <span className="font-mono font-medium text-text">{deleting?.name}</span> ({deleting && tagName(deleting.tagId)})
          and all {deleting?.latestVersion} of its versions? Anything reading it will stop getting a value. This can't be undone.
        </p>
      </ConfirmDialog>
    </div>
  )
}
