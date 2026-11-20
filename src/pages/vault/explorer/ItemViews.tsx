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
/** Item folders: Env (keys), Conf (config files) and Notes, each a details list with a preview pane. */

import {
  Download,
  Eye,
  EyeOff,
  FileCode2,
  FilePlus2,
  History,
  KeyRound,
  Lock,
  PencilLine,
  Plus,
  StickyNote,
  Trash2,
  Upload,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Badge } from '@/components/atoms/Badge'
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog'
import { CopyButton } from '@/components/molecules/CopyButton'
import { LoadingButton } from '@/components/molecules/LoadingButton'
import { SkeletonText } from '@/components/molecules/Skeleton'
import { ConfigFilePanel, NewConfigDialog } from '@/components/organisms/ConfigFilePanels'
import { NoteForm, NotePanel, NoteShareDialog } from '@/components/organisms/NotePanels'
import {
  ExportDotenvDialog,
  ImportDotenvDialog,
  SecretDialog,
  SecretHistoryDialog,
  type SecretDialogState,
} from '@/components/organisms/SecretDialogs'
import { useTagOptions } from '@/features/admin/hooks/useTagOptions'
import { useSelectedTag } from '@/features/tags/hooks/useTags'
import {
  useConfigs,
  useDeleteConfig,
  useDeleteNote,
  useDeleteSecret,
  useNotes,
  useRevealSecret,
  useSecrets,
} from '@/features/vault/hooks/useVault'
import type { ConfigFile, SecretKey, SecureNote, VaultProject } from '@/features/vault/types'
import { formatBytes, formatDateTime, formatRelative } from '@/utils/format'
import { FolderContents, FolderHeader, FolderLayout, FolderPage, ListCard, LocalOnlyBadge, PreviewCard } from './ExplorerParts'
import { FileGlyph } from './ExplorerIcons'
import { plural, vaultPath } from './sections'
import { useSelectedItem } from './useSelectedItem'

const matches = (search: string, ...values: string[]) => {
  const q = search.trim().toLowerCase()
  return !q || values.some((v) => v.toLowerCase().includes(q))
}

/** The top bar's tag filter, as Env and Conf apply it. */
const useTagFilter = () => {
  const { selectedTag } = useSelectedTag()
  return {
    selectedTag,
    /** Tag column and tile subtitle only make sense under "All tags". */
    show: !selectedTag,
    keep: (tagId: number) => !selectedTag || tagId === selectedTag.tagId,
    note: selectedTag ? `Filtered to tag ${selectedTag.tagName}` : 'All tags',
  }
}

/** Loading placeholder for a folder's list. */
const Loading = () => <SkeletonText lines={6} />

/** "Vault / <project>" above a folder's title. */
const folderPath = (project: VaultProject) => [
  { label: 'Vault', to: vaultPath() },
  { label: project.projectName, to: vaultPath(project.projectId) },
]

// ── Env ──────────────────────────────────────────────────

/** A key's preview: its value (reveal / copy, unless hidden), tag, version and actions. */
const KeyPreview = ({
  secret,
  tagName,
  onNewVersion,
  onHistory,
  onDelete,
}: {
  secret: SecretKey
  tagName: (id: number) => string
  onNewVersion: () => void
  onHistory: () => void
  onDelete: () => void
}) => {
  const { mutateAsync: reveal } = useRevealSecret()
  const [value, setValue] = useState<string | undefined>()

  /** Shows or hides the value; showing it fetches (and audits) the version in use. */
  const toggle = async () => {
    if (value !== undefined) return setValue(undefined)
    try {
      setValue(await reveal({ secretId: secret.secretId }))
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        {secret.isHidden ? (
          <Lock size={32} className="shrink-0 text-text-muted" aria-hidden="true" />
        ) : (
          <KeyRound size={32} className="shrink-0 text-signal" aria-hidden="true" />
        )}
        <div className="min-w-0">
          <h2 className="truncate font-mono font-semibold text-text">{secret.name}</h2>
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
            Key ·
            <Badge tone="accent" mono>
              {tagName(secret.tagId)}
            </Badge>
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-ink/40 p-3">
        <p className="mb-1.5 text-xs text-text-muted">Value (v{secret.currentVersion})</p>
        {secret.isHidden ? (
          <p className="flex items-center gap-1.5 text-sm text-text-muted">
            <Lock size={13} aria-hidden="true" />
            Hidden: it can be used, but not shown, copied or exported.
          </p>
        ) : (
          <div className="flex items-center gap-1">
            <code className="min-w-0 flex-1 font-mono text-xs break-all text-text">{value ?? '••••••••••••'}</code>
            <LoadingButton
              variant="ghost"
              size="sm"
              icon={value !== undefined ? <EyeOff size={14} /> : <Eye size={14} />}
              aria-label={`${value !== undefined ? 'Hide' : 'Reveal'} ${secret.name}`}
              onClick={toggle}
            />
            <CopyButton
              label={`Copy ${secret.name}`}
              getText={() => (value !== undefined ? Promise.resolve(value) : reveal({ secretId: secret.secretId }))}
            />
          </div>
        )}
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-text-muted">Version</dt>
        <dd className="text-text">
          v{secret.currentVersion}
          {secret.currentVersion !== secret.latestVersion && (
            <Badge tone="warning" className="ml-1.5">
              rolled back from v{secret.latestVersion}
            </Badge>
          )}
        </dd>
        <dt className="text-text-muted">Modified</dt>
        <dd className="text-text" title={formatDateTime(secret.updatedAt)}>
          {formatRelative(secret.updatedAt)} by {secret.updatedBy}
        </dd>
      </dl>

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <LoadingButton variant="secondary" size="sm" icon={<PencilLine size={14} />} onClick={onNewVersion}>
          New version
        </LoadingButton>
        <LoadingButton variant="ghost" size="sm" icon={<History size={14} />} onClick={onHistory}>
          History
        </LoadingButton>
        <LoadingButton
          variant="ghost"
          size="sm"
          icon={<Trash2 size={14} />}
          aria-label={`Delete ${secret.name}`}
          title="Delete"
          onClick={onDelete}
        />
      </div>
    </div>
  )
}

/** The Env folder: a project's keys. Double-click (or Enter) opens a key's history. */
export const EnvView = ({ project }: { project: VaultProject }) => {
  const navigate = useNavigate()
  const { data: secrets, isLoading } = useSecrets(project.projectId)
  const { tagName } = useTagOptions()
  const tags = useTagFilter()
  const { mutateAsync: remove } = useDeleteSecret()
  const [selectedId, select] = useSelectedItem()
  const [dialog, setDialog] = useState<SecretDialogState>({ kind: 'closed' })
  const [history, setHistory] = useState<SecretKey | null>(null)
  const [deleting, setDeleting] = useState<SecretKey | null>(null)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [search, setSearch] = useState('')
  const defaultTagId = tags.selectedTag?.tagId ?? 0

  const visible = (secrets ?? [])
    .filter((s) => tags.keep(s.tagId) && matches(search, s.name))
    .sort((a, b) => a.name.localeCompare(b.name) || tagName(a.tagId).localeCompare(tagName(b.tagId)))
  const selected = visible.find((s) => s.secretId === selectedId) ?? null

  return (
    <>
      <FolderPage
        header={
          <FolderHeader
            path={folderPath(project)}
            title="Env"
            badge={<LocalOnlyBadge />}
            actions={
              <>
                <LoadingButton variant="ghost" icon={<Upload size={14} />} onClick={() => setImporting(true)}>
                  Import .env
                </LoadingButton>
                <LoadingButton
                  variant="ghost"
                  icon={<Download size={14} />}
                  disabled={!secrets?.length}
                  onClick={() => setExporting(true)}
                >
                  Export
                </LoadingButton>
                <LoadingButton icon={<Plus size={15} />} onClick={() => setDialog({ kind: 'create' })}>
                  New key
                </LoadingButton>
              </>
            }
          />
        }
      >
        <FolderLayout
          list={
            <ListCard title="Keys" count={visible.length} search={search} onSearch={setSearch} note={tags.note}>
              {isLoading ? (
                <Loading />
              ) : (
                <FolderContents
                  label="Contents of Env"
                  rows={visible}
                  rowId={(s) => s.secretId}
                  name={(s) => <span className="font-mono">{s.name}</span>}
                  text={(s) => s.name}
                  subtitle={tags.show ? (s) => tagName(s.tagId) : undefined}
                  bigIcon={(s) => (s.isHidden ? <FileGlyph glyph={Lock} /> : <FileGlyph glyph={KeyRound} tone="signal" />)}
                  icon={(s) =>
                    s.isHidden ? <Lock size={15} className="text-text-muted" /> : <KeyRound size={15} className="text-signal" />
                  }
                  columns={[
                    ...(tags.show
                      ? [
                          {
                            key: 'tag',
                            label: 'Tag',
                            render: (s: SecretKey) => (
                              <Badge tone="accent" mono>
                                {tagName(s.tagId)}
                              </Badge>
                            ),
                          },
                        ]
                      : []),
                    {
                      key: 'version',
                      label: 'Version',
                      render: (s) => (
                        <>
                          v{s.currentVersion}
                          {s.currentVersion !== s.latestVersion && (
                            <Badge tone="warning" className="ml-1.5">
                              rolled back from v{s.latestVersion}
                            </Badge>
                          )}
                        </>
                      ),
                    },
                    {
                      key: 'modified',
                      label: 'Modified',
                      render: (s) => (
                        <span title={`${formatDateTime(s.updatedAt)} by ${s.updatedBy}`}>{formatRelative(s.updatedAt)}</span>
                      ),
                    },
                  ]}
                  selectedId={selectedId}
                  onSelect={select}
                  onOpen={setHistory}
                  onDelete={setDeleting}
                  onUp={() => navigate(vaultPath(project.projectId))}
                  empty={secrets?.length ? 'No keys match your search or tag.' : 'No keys yet. Add one or import a .env file.'}
                />
              )}
            </ListCard>
          }
          preview={
            selected && (
              <PreviewCard onClose={() => select(null)}>
                <KeyPreview
                  key={selected.secretId}
                  secret={selected}
                  tagName={tagName}
                  onNewVersion={() => setDialog({ kind: 'version', secret: selected })}
                  onHistory={() => setHistory(selected)}
                  onDelete={() => setDeleting(selected)}
                />
              </PreviewCard>
            )
          }
        />
      </FolderPage>
      <SecretDialog
        state={dialog}
        project={project}
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
        project={project}
        existing={secrets ?? []}
        defaultTagId={defaultTagId}
        onClose={() => setImporting(false)}
      />
      <ExportDotenvDialog
        open={exporting}
        project={project}
        defaultTagId={defaultTagId}
        tagName={tagName}
        onClose={() => setExporting(false)}
      />
      <ConfirmDialog
        open={!!deleting}
        title="Delete key"
        confirmLabel="Delete key"
        successMessage={`Deleted ${deleting?.name}.`}
        onConfirm={() => remove(deleting!.secretId).then(() => select(null))}
        onClose={() => setDeleting(null)}
      >
        <p>
          Delete <span className="font-mono font-medium text-text">{deleting?.name}</span> ({deleting && tagName(deleting.tagId)})
          and all {deleting?.latestVersion} of its versions? Anything reading it will stop getting a value. This can't be undone.
        </p>
      </ConfirmDialog>
    </>
  )
}

// ── Conf ─────────────────────────────────────────────────

/** The Conf folder: a project's config files; the preview pane is the file's editor. */
export const ConfView = ({ project }: { project: VaultProject }) => {
  const navigate = useNavigate()
  const { data: files, isLoading } = useConfigs(project.projectId)
  const { tagName } = useTagOptions()
  const tags = useTagFilter()
  const { mutateAsync: remove } = useDeleteConfig()
  const [selectedId, select] = useSelectedItem()
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<ConfigFile | null>(null)
  const [search, setSearch] = useState('')

  const visible = (files ?? [])
    .filter((f) => tags.keep(f.tagId) && matches(search, f.fileName))
    .sort((a, b) => a.fileName.localeCompare(b.fileName) || tagName(a.tagId).localeCompare(tagName(b.tagId)))
  const selected = visible.find((f) => f.fileId === selectedId) ?? null

  return (
    <>
      <FolderPage
        header={
          <FolderHeader
            path={folderPath(project)}
            title="Conf"
            badge={<LocalOnlyBadge />}
            actions={
              <LoadingButton icon={<FilePlus2 size={15} />} onClick={() => setCreating(true)}>
                New file
              </LoadingButton>
            }
          />
        }
      >
        <FolderLayout
          wide
          list={
            <ListCard title="Files" count={visible.length} search={search} onSearch={setSearch} note={tags.note}>
              {isLoading ? (
                <Loading />
              ) : (
                <FolderContents
                  label="Contents of Conf"
                  rows={visible}
                  rowId={(f) => f.fileId}
                  name={(f) => <span className="font-mono">{f.fileName}</span>}
                  text={(f) => f.fileName}
                  subtitle={tags.show ? (f) => tagName(f.tagId) : undefined}
                  bigIcon={() => <FileGlyph glyph={FileCode2} tone="accent" />}
                  icon={() => <FileCode2 size={15} className="text-accent-secondary" />}
                  columns={[
                    ...(tags.show
                      ? [
                          {
                            key: 'tag',
                            label: 'Tag',
                            render: (f: ConfigFile) => (
                              <Badge tone="accent" mono>
                                {tagName(f.tagId)}
                              </Badge>
                            ),
                          },
                        ]
                      : []),
                    { key: 'version', label: 'Version', render: (f) => `v${f.currentVersion}` },
                    { key: 'size', label: 'Size', render: (f) => formatBytes(f.sizeBytes) },
                    { key: 'modified', label: 'Modified', render: (f) => formatRelative(f.updatedAt) },
                  ]}
                  selectedId={selectedId}
                  onSelect={select}
                  onDelete={setDeleting}
                  onUp={() => navigate(vaultPath(project.projectId))}
                  empty={files?.length ? 'No files match your search or tag.' : 'No config files yet.'}
                />
              )}
            </ListCard>
          }
          preview={
            selected && (
              <PreviewCard onClose={() => select(null)}>
                <ConfigFilePanel key={selected.fileId} file={selected} onDelete={() => setDeleting(selected)} />
              </PreviewCard>
            )
          }
        />
      </FolderPage>
      <NewConfigDialog
        open={creating}
        project={project}
        defaultTagId={tags.selectedTag?.tagId ?? 0}
        onClose={() => setCreating(false)}
        onCreated={(f) => select(f.fileId)}
      />
      <ConfirmDialog
        open={!!deleting}
        title="Delete config file"
        confirmLabel="Delete file"
        successMessage={`Deleted ${deleting?.fileName}.`}
        onConfirm={() => remove(deleting!.fileId).then(() => select(null))}
        onClose={() => setDeleting(null)}
      >
        <p>
          Delete <span className="font-mono font-medium text-text">{deleting?.fileName}</span> (
          {deleting && tagName(deleting.tagId)}) and all {deleting?.latestVersion} of its versions? This can't be undone.
        </p>
      </ConfirmDialog>
    </>
  )
}

// ── Notes ────────────────────────────────────────────────

/** Who can see a note, short, for the list. */
const sharingLabel = (n: SecureNote) => {
  if (n.myAccess === 'edit') return 'Shared with you · can edit'
  if (n.myAccess === 'read') return 'Shared with you · read only'
  const parts = [
    n.shares.length && `${n.shares.length} ${n.shares.length === 1 ? 'person' : 'people'}`,
    n.links.length && plural(n.links.length, 'link'),
  ].filter(Boolean)
  return parts.length ? `Shared: ${parts.join(', ')}` : 'Private'
}

/** The Notes folder: notes you own or that are shared with you. Not tagged. */
export const NotesView = ({ project }: { project: VaultProject }) => {
  const navigate = useNavigate()
  const { data: notes, isLoading } = useNotes(project.projectId)
  const { mutateAsync: remove } = useDeleteNote()
  const [selectedId, select] = useSelectedItem()
  const [creating, setCreating] = useState(false)
  const [sharing, setSharing] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<SecureNote | null>(null)
  const [search, setSearch] = useState('')

  const visible = (notes ?? []).filter((n) => matches(search, n.title, n.ownerName))
  const selected = visible.find((n) => n.noteId === selectedId) ?? null

  return (
    <>
      <FolderPage
        header={
          <FolderHeader
            path={folderPath(project)}
            title="Notes"
            badge={<LocalOnlyBadge />}
            actions={
              <LoadingButton icon={<Plus size={15} />} onClick={() => setCreating(true)}>
                New note
              </LoadingButton>
            }
          />
        }
      >
        <FolderLayout
          wide
          list={
            <ListCard
              title="Notes"
              count={visible.length}
              search={search}
              onSearch={setSearch}
              note="Yours and those shared with you. Notes aren't tagged."
            >
              {isLoading ? (
                <Loading />
              ) : (
                <FolderContents
                  label="Contents of Notes"
                  rows={visible}
                  rowId={(n) => n.noteId}
                  name={(n) => n.title}
                  text={(n) => n.title}
                  subtitle={(n) => (n.myAccess === 'owner' ? sharingLabel(n) : n.ownerName)}
                  bigIcon={() => <FileGlyph glyph={StickyNote} tone="warning" lines />}
                  icon={(n) => (
                    <StickyNote
                      size={15}
                      className={
                        n.myAccess === 'owner' && !n.shares.length && !n.links.length ? 'text-warning' : 'text-accent-secondary'
                      }
                    />
                  )}
                  columns={[
                    { key: 'owner', label: 'Owner', render: (n) => (n.myAccess === 'owner' ? 'You' : n.ownerName) },
                    { key: 'sharing', label: 'Sharing', render: sharingLabel },
                    { key: 'modified', label: 'Modified', render: (n) => formatRelative(n.updatedAt) },
                  ]}
                  selectedId={creating ? null : selectedId}
                  onSelect={(id) => {
                    setCreating(false)
                    select(id)
                  }}
                  onDelete={(n) => n.myAccess === 'owner' && setDeleting(n)}
                  onUp={() => navigate(vaultPath(project.projectId))}
                  empty={notes?.length ? 'No notes match your search.' : 'No notes yet. Yours stay private until you share them.'}
                />
              )}
            </ListCard>
          }
          preview={
            (creating || selected) && (
              <PreviewCard onClose={creating ? () => setCreating(false) : selected ? () => select(null) : undefined}>
                {creating ? (
                  <>
                    <h2 className="mb-4 font-semibold text-text">New note in {project.projectName}</h2>
                    <NoteForm
                      projectId={project.projectId}
                      onDone={() => setCreating(false)}
                      onSaved={({ noteId }) => {
                        if (noteId !== undefined) select(noteId)
                      }}
                    />
                  </>
                ) : selected ? (
                  <NotePanel
                    key={selected.noteId}
                    note={selected}
                    onShare={() => setSharing(selected.noteId)}
                    onDelete={() => setDeleting(selected)}
                  />
                ) : null}
              </PreviewCard>
            )
          }
        />
      </FolderPage>
      <NoteShareDialog note={notes?.find((n) => n.noteId === sharing) ?? null} onClose={() => setSharing(null)} />
      <ConfirmDialog
        open={!!deleting}
        title="Delete note"
        confirmLabel="Delete note"
        successMessage={`Deleted "${deleting?.title}".`}
        onConfirm={() => remove(deleting!.noteId).then(() => select(null))}
        onClose={() => setDeleting(null)}
      >
        <p>
          Delete <span className="font-medium text-text">{deleting?.title}</span> with all {deleting?.latestVersion} versions? Its
          public links stop working and people it was shared with lose access. This can't be undone.
        </p>
      </ConfirmDialog>
    </>
  )
}
