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
/** Vault › Config files (/vault/config-files): simple versioned file storage per service and tag. */

import { FileText, Plus } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/atoms/Badge'
import { LoadingButton, TableSkeleton } from '@/components/loading'
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog'
import { PageHeader } from '@/components/molecules/PageHeader'
import { ConfigFilePanel, NewConfigDialog } from '@/components/organisms/ConfigFilePanels'
import { VaultScopeBar } from '@/components/organisms/VaultScopeBar'
import { useTagOptions } from '@/features/admin/hooks/useTagOptions'
import { useSelectedTag } from '@/features/tags/hooks/useTags'
import { useConfigs, useDeleteConfig, useVaultScope } from '@/features/vault/hooks/useVault'
import type { ConfigFile } from '@/features/vault/types'
import { cn } from '@/utils/cn'
import { formatBytes, formatRelative } from '@/utils/format'

/** File list on the left, the open file on the right. */
export const VaultConfigFilesPage = () => {
  const scope = useVaultScope()
  const { service } = scope
  const { data: files, isLoading } = useConfigs(service?.serviceId ?? null)
  const { selectedTag } = useSelectedTag()
  const { tagName } = useTagOptions()
  const { mutateAsync: remove } = useDeleteConfig()
  const [openId, setOpenId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<ConfigFile | null>(null)

  const visible = (files ?? [])
    .filter((f) => !selectedTag || f.tagId === selectedTag.tagId)
    .sort((a, b) => a.fileName.localeCompare(b.fileName) || tagName(a.tagId).localeCompare(tagName(b.tagId)))
  const open = visible.find((f) => f.fileId === openId) ?? visible[0] ?? null

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Config files"
        description="Config files per service and tag, like nginx.conf or docker-compose.yml. Every save is a new version."
        mock
        actions={
          service && (
            <LoadingButton icon={<Plus size={15} />} onClick={() => setCreating(true)}>
              New file
            </LoadingButton>
          )
        }
      />

      {scope.isLoading ? <TableSkeleton rows={2} columns={3} title={false} /> : <VaultScopeBar scope={scope} />}

      {!scope.isLoading && !service ? (
        <p className="py-10 text-center text-sm text-text-muted">
          {scope.project ? 'Add a service to this project to store files.' : 'Create a project to get started.'}
        </p>
      ) : isLoading || scope.isLoading ? (
        <TableSkeleton rows={4} columns={2} />
      ) : !visible.length ? (
        <section className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface-raised py-12 text-center">
          <FileText size={22} className="text-text-muted" aria-hidden="true" />
          <p className="text-sm text-text-muted">
            {files?.length
              ? `No files tagged ${selectedTag?.tagName} in ${service?.serviceName}.`
              : `No config files in ${service?.serviceName} yet.`}
          </p>
        </section>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[260px_1fr]">
          <nav aria-label="Files" className="flex flex-col gap-1 rounded-xl border border-border bg-surface-raised p-2">
            {visible.map((f) => (
              <button
                key={f.fileId}
                type="button"
                onClick={() => setOpenId(f.fileId)}
                aria-current={f.fileId === open?.fileId ? 'true' : undefined}
                className={cn(
                  'flex flex-col gap-1 rounded-lg px-3 py-2 text-left transition-colors',
                  f.fileId === open?.fileId ? 'bg-signal/10' : 'hover:bg-ink',
                )}
              >
                <span className="flex items-center gap-2">
                  <FileText size={14} className="shrink-0 text-text-muted" aria-hidden="true" />
                  <span className="truncate font-mono text-sm font-medium text-text">{f.fileName}</span>
                </span>
                <span className="flex flex-wrap items-center gap-1.5 pl-6 text-xs text-text-muted">
                  <Badge tone="accent" mono>
                    {tagName(f.tagId)}
                  </Badge>
                  v{f.currentVersion} · {formatBytes(f.sizeBytes)} · {formatRelative(f.updatedAt)}
                </span>
              </button>
            ))}
          </nav>
          <section className="min-w-0 rounded-xl border border-border bg-surface-raised p-5">
            {open && <ConfigFilePanel file={open} onDelete={() => setDeleting(open)} />}
          </section>
        </div>
      )}

      <NewConfigDialog
        open={creating}
        service={service}
        defaultTagId={selectedTag?.tagId ?? 0}
        onClose={() => setCreating(false)}
        onCreated={(f) => setOpenId(f.fileId)}
      />
      <ConfirmDialog
        open={!!deleting}
        title="Delete config file"
        confirmLabel="Delete file"
        successMessage={`Deleted ${deleting?.fileName}.`}
        onConfirm={() => remove(deleting!.fileId)}
        onClose={() => setDeleting(null)}
      >
        <p>
          Delete <span className="font-mono font-medium text-text">{deleting?.fileName}</span> (
          {deleting && tagName(deleting.tagId)}) and all {deleting?.latestVersion} of its versions? This can't be undone.
        </p>
      </ConfirmDialog>
    </div>
  )
}
