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
/** Config file panels: the editor with history and diff, and the new-file dialog. */

import { Download, History, RotateCcw, Trash2, Upload, X } from 'lucide-react'
import { useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react'
import { toast } from 'react-toastify'
import { Badge } from '@/components/atoms/Badge'
import { Input } from '@/components/atoms/Input'
import { Select } from '@/components/atoms/Select'
import { Textarea } from '@/components/atoms/Textarea'
import { LoadingButton, SkeletonText, useAsyncAction } from '@/components/loading'
import { Dialog } from '@/components/molecules/Dialog'
import { DiffView } from '@/components/molecules/DiffView'
import { FormField } from '@/components/molecules/FormField'
import { useTagOptions } from '@/features/admin/hooks/useTagOptions'
import { MAX_CONFIG_BYTES } from '@/features/vault/api/configs'
import {
  useConfigContent,
  useConfigVersions,
  useCreateConfig,
  useRollbackConfig,
  useSaveConfig,
} from '@/features/vault/hooks/useVault'
import type { ConfigFile, VaultService } from '@/features/vault/types'
import { cn } from '@/utils/cn'
import { downloadText } from '@/utils/download'
import { formatBytes, formatDateTime, formatRelative } from '@/utils/format'

/** Version list plus a diff of the picked version against the one in use. */
const ConfigHistory = ({ file, current }: { file: ConfigFile; current: string }) => {
  const { data: versions } = useConfigVersions(file.fileId)
  const [picked, setPicked] = useState<number | null>(null)
  const { data: pickedVersion, isLoading } = useConfigContent(file.fileId, picked)
  const { mutateAsync: rollback } = useRollbackConfig()
  const [state, run] = useAsyncAction((version: number) => rollback({ fileId: file.fileId, version }), { successMs: 600 })

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
      <ol className="flex flex-col gap-1" aria-label="Versions">
        {versions?.map((v) => (
          <li key={v.version}>
            <button
              type="button"
              onClick={() => setPicked(v.version)}
              aria-pressed={picked === v.version}
              className={cn(
                'w-full rounded-md border px-3 py-2 text-left transition-colors',
                picked === v.version ? 'border-signal bg-signal/10' : 'border-transparent hover:bg-ink',
              )}
            >
              <span className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-text">v{v.version}</span>
                {v.version === file.currentVersion && <Badge tone="signal">In use</Badge>}
              </span>
              <span className="block truncate text-xs text-text-muted" title={formatDateTime(v.createdAt)}>
                {v.createdBy} · {formatRelative(v.createdAt)}
              </span>
              {v.note && <span className="block truncate text-xs text-text-muted">{v.note}</span>}
            </button>
          </li>
        ))}
      </ol>
      <div className="min-w-0">
        {picked === null ? (
          <p className="py-6 text-sm text-text-muted">Pick a version to compare it with the one in use.</p>
        ) : isLoading || !pickedVersion ? (
          <SkeletonText lines={6} />
        ) : (
          <div className="flex flex-col gap-3">
            <DiffView
              before={pickedVersion.content}
              after={current}
              beforeLabel={`v${picked}`}
              afterLabel={`v${file.currentVersion} (in use)`}
            />
            <div className="flex flex-wrap justify-end gap-2">
              <LoadingButton
                variant="ghost"
                size="sm"
                icon={<Download size={14} />}
                onClick={() => downloadText(`${file.fileName}.v${picked}`, pickedVersion.content)}
              >
                Download v{picked}
              </LoadingButton>
              {picked !== file.currentVersion && (
                <LoadingButton
                  variant="secondary"
                  size="sm"
                  icon={<RotateCcw size={13} />}
                  state={state}
                  onClick={() =>
                    run(picked)
                      .then(() => toast.success(`${file.fileName} now uses v${picked}.`))
                      .catch((e: Error) => toast.error(e.message))
                  }
                >
                  Use v{picked}
                </LoadingButton>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** The editor for the version in use; saving makes a new version. Mount with key={fileId-currentVersion}. */
const ConfigEditor = ({ file, content, onDelete }: { file: ConfigFile; content: string; onDelete: () => void }) => {
  const { tagName } = useTagOptions()
  const [draft, setDraft] = useState(content)
  const [note, setNote] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const { mutateAsync: saveVersion } = useSaveConfig()
  const [state, save] = useAsyncAction(() => saveVersion({ fileId: file.fileId, content: draft, note }), { successMs: 600 })
  const dirty = draft !== content

  const submit = () => {
    if (!dirty || state !== 'idle') return
    save()
      .then(() => toast.success(`Saved ${file.fileName} as v${file.latestVersion + 1}.`))
      .catch((e: Error) => toast.error(e.message))
  }
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-mono text-base font-semibold text-text">{file.fileName}</h2>
        <Badge tone="accent" mono>
          {tagName(file.tagId)}
        </Badge>
        <span className="font-mono text-sm text-text-muted">v{file.currentVersion}</span>
        {file.currentVersion !== file.latestVersion && <Badge tone="warning">rolled back from v{file.latestVersion}</Badge>}
        <span className="text-xs text-text-muted" title={formatDateTime(file.updatedAt)}>
          {formatBytes(file.sizeBytes)} · {formatRelative(file.updatedAt)} by {file.updatedBy}
        </span>
        <span className="ml-auto flex gap-1">
          <LoadingButton
            variant={showHistory ? 'secondary' : 'ghost'}
            size="sm"
            icon={<History size={14} />}
            aria-pressed={showHistory}
            onClick={() => setShowHistory((s) => !s)}
          >
            History
          </LoadingButton>
          <LoadingButton
            variant="ghost"
            size="sm"
            icon={<Download size={14} />}
            aria-label={`Download ${file.fileName}`}
            title="Download"
            onClick={() => downloadText(file.fileName, content)}
          />
          <LoadingButton
            variant="ghost"
            size="sm"
            icon={<Trash2 size={14} />}
            aria-label={`Delete ${file.fileName}`}
            title="Delete"
            onClick={onDelete}
          />
        </span>
      </div>

      {showHistory ? (
        <ConfigHistory file={file} current={content} />
      ) : (
        <>
          <Textarea
            aria-label={`Contents of ${file.fileName}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={Math.min(28, Math.max(12, draft.split('\n').length + 1))}
            className="font-mono text-xs leading-5"
            spellCheck={false}
            wrap="off"
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-text-muted">{draft.split('\n').length} lines</span>
            {dirty && (
              <>
                <Input
                  aria-label="Reason for the change"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What changed? (optional)"
                  className="ml-auto w-64 py-1.5"
                />
                <LoadingButton variant="ghost" size="sm" icon={<X size={14} />} onClick={() => setDraft(content)}>
                  Discard
                </LoadingButton>
                <LoadingButton size="sm" state={state} loadingText="Saving" successText="Saved" onClick={submit}>
                  Save as v{file.latestVersion + 1}
                </LoadingButton>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/** Loads the version in use and shows the editor. */
export const ConfigFilePanel = ({ file, onDelete }: { file: ConfigFile; onDelete: () => void }) => {
  const { data, isLoading, error } = useConfigContent(file.fileId, null, file.currentVersion)
  if (isLoading) return <SkeletonText lines={10} />
  if (error || !data)
    return (
      <p className="text-sm text-text-muted">
        Couldn't open {file.fileName}: {error?.message}
      </p>
    )
  return <ConfigEditor key={`${file.fileId}-${file.currentVersion}`} file={file} content={data.content} onDelete={onDelete} />
}

// ── New file ─────────────────────────────────────────────

const NewConfigForm = ({
  service,
  defaultTagId,
  onClose,
  onCreated,
}: {
  service: VaultService
  defaultTagId: number
  onClose: () => void
  onCreated: (file: ConfigFile) => void
}) => {
  const { options } = useTagOptions()
  const [fileName, setFileName] = useState('')
  const [tagId, setTagId] = useState(defaultTagId)
  const [content, setContent] = useState('')
  const [errors, setErrors] = useState<{ name?: string; tag?: string }>({})
  const { mutateAsync: create } = useCreateConfig()
  const [state, save] = useAsyncAction(
    () => create({ serviceId: service.serviceId, input: { fileName, tagId, content, note: '' } }),
    { successMs: 400 },
  )

  const loadFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > MAX_CONFIG_BYTES) {
      toast.error(`Files can be up to ${MAX_CONFIG_BYTES / 1024} KB.`)
      return
    }
    if (!fileName) setFileName(file.name)
    file.text().then(setContent)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!/^[\w.-]{1,100}$/.test(fileName)) next.name = 'Use letters, numbers, dots, dashes or underscores (no folders).'
    if (!tagId) next.tag = 'Pick a tag.'
    setErrors(next)
    if (Object.keys(next).length) return
    save()
      .then((file) => {
        toast.success(`Created ${file.fileName}.`)
        onCreated(file)
        setTimeout(onClose, 400)
      })
      .catch((err: Error) => toast.error(err.message))
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[3fr_2fr]">
        <FormField id="configName" label="File name" error={errors.name}>
          <Input
            id="configName"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="nginx.conf"
            className="font-mono"
            autoComplete="off"
            spellCheck={false}
            autoFocus
            hasError={!!errors.name}
          />
        </FormField>
        <FormField id="configTag" label="Tag" error={errors.tag}>
          <Select id="configTag" value={tagId} onChange={(e) => setTagId(Number(e.target.value))} hasError={!!errors.tag}>
            <option value={0} disabled>
              Pick a tag
            </option>
            {options.map((t) => (
              <option key={t.tagId} value={t.tagId}>
                {t.tagName}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      <FormField
        id="configContent"
        label="Contents"
        labelExtra={
          <label className="flex cursor-pointer items-center gap-1 text-sm text-signal hover:text-signal-strong">
            <Upload size={13} />
            Upload file
            <input type="file" className="sr-only" onChange={loadFile} />
          </label>
        }
      >
        <Textarea
          id="configContent"
          rows={10}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="font-mono text-xs"
          spellCheck={false}
          wrap="off"
        />
      </FormField>
      <div className="flex justify-end gap-2">
        <LoadingButton variant="ghost" onClick={onClose}>
          Cancel
        </LoadingButton>
        <LoadingButton type="submit" state={state} loadingText="Creating" successText="Created">
          Create file
        </LoadingButton>
      </div>
    </form>
  )
}

/** Creates a config file in `service`, typed in or uploaded. */
export const NewConfigDialog = ({
  open,
  service,
  defaultTagId,
  onClose,
  onCreated,
}: {
  open: boolean
  service: VaultService | null
  defaultTagId: number
  onClose: () => void
  onCreated: (file: ConfigFile) => void
}) => (
  <Dialog
    open={open && !!service}
    onClose={onClose}
    size="lg"
    title={`New config file in ${service?.serviceName}`}
    description="Text files up to 256 KB. Each save keeps the previous version."
  >
    {service && <NewConfigForm service={service} defaultTagId={defaultTagId} onClose={onClose} onCreated={onCreated} />}
  </Dialog>
)
