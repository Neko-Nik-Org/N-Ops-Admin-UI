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
/** Dialogs for the Keys store: new key / new version, version history, and .env import / export. */

import { Eye, EyeOff, RotateCcw, Upload } from 'lucide-react'
import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { toast } from 'react-toastify'
import { Badge } from '@/components/atoms/Badge'
import { Input } from '@/components/atoms/Input'
import { Select } from '@/components/atoms/Select'
import { Textarea } from '@/components/atoms/Textarea'
import { LoadingButton, SkeletonText, useAsyncAction } from '@/components/loading'
import { Dialog } from '@/components/molecules/Dialog'
import { FormField } from '@/components/molecules/FormField'
import { useTagOptions } from '@/features/admin/hooks/useTagOptions'
import { SECRET_NAME } from '@/features/vault/api/secrets'
import { parseDotenv } from '@/features/vault/dotenv'
import {
  useAddSecretVersion,
  useCreateSecret,
  useExportDotenv,
  useImportDotenv,
  useRevealSecret,
  useRollbackSecret,
  useSecretVersions,
} from '@/features/vault/hooks/useVault'
import type { SecretKey, VaultService } from '@/features/vault/types'
import { downloadText } from '@/utils/download'
import { formatDateTime, formatRelative } from '@/utils/format'

/** Tag picker shared by these dialogs. */
const TagSelect = ({
  id,
  value,
  onChange,
  error,
}: {
  id: string
  value: number
  onChange: (v: number) => void
  error?: string
}) => {
  const { options } = useTagOptions()
  return (
    <FormField id={id} label="Tag" error={error}>
      <Select id={id} value={value} onChange={(e) => onChange(Number(e.target.value))} hasError={!!error}>
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
  )
}

// ── New key / new version ────────────────────────────────

/** What the secret dialog is doing. */
export type SecretDialogState = { kind: 'closed' } | { kind: 'create' } | { kind: 'version'; secret: SecretKey }

const SecretForm = ({
  state,
  service,
  defaultTagId,
  onClose,
}: {
  state: Exclude<SecretDialogState, { kind: 'closed' }>
  service: VaultService
  defaultTagId: number
  onClose: () => void
}) => {
  const isVersion = state.kind === 'version'
  const [name, setName] = useState('')
  const [tagId, setTagId] = useState(defaultTagId)
  const [value, setValue] = useState('')
  const [note, setNote] = useState('')
  const [show, setShow] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; tag?: string; value?: string }>({})
  const { mutateAsync: create } = useCreateSecret()
  const { mutateAsync: addVersion } = useAddSecretVersion()
  const [saveState, save] = useAsyncAction(
    () =>
      isVersion
        ? addVersion({ secretId: state.secret.secretId, value, note })
        : create({ serviceId: service.serviceId, input: { name, tagId, value, note } }).then(() => undefined),
    { successMs: 400 },
  )

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!isVersion && !SECRET_NAME.test(name)) next.name = 'Use letters, numbers and underscores, not starting with a number.'
    if (!isVersion && !tagId) next.tag = 'Pick a tag.'
    if (!value) next.value = 'Enter a value.'
    setErrors(next)
    if (Object.keys(next).length) return
    save()
      .then(() => {
        toast.success(isVersion ? `${state.secret.name} is now on v${state.secret.latestVersion + 1}.` : `Added ${name}.`)
        setTimeout(onClose, 400)
      })
      .catch((err: Error) => toast.error(err.message))
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {!isVersion && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[3fr_2fr]">
          <FormField id="secretName" label="Name" error={errors.name}>
            <Input
              id="secretName"
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              placeholder="DATABASE_URL"
              className="font-mono"
              autoComplete="off"
              spellCheck={false}
              autoFocus
              hasError={!!errors.name}
            />
          </FormField>
          <TagSelect id="secretTag" value={tagId} onChange={setTagId} error={errors.tag} />
        </div>
      )}
      <FormField
        id="secretValue"
        label={isVersion ? 'New value' : 'Value'}
        error={errors.value}
        labelExtra={
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text"
            onClick={() => setShow((s) => !s)}
            aria-pressed={show}
          >
            {show ? <EyeOff size={13} /> : <Eye size={13} />}
            {show ? 'Hide' : 'Show'}
          </button>
        }
      >
        <Textarea
          id="secretValue"
          rows={3}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="font-mono"
          style={show ? undefined : ({ WebkitTextSecurity: 'disc' } as React.CSSProperties)}
          autoComplete="off"
          spellCheck={false}
          autoFocus={isVersion}
          hasError={!!errors.value}
        />
      </FormField>
      <FormField id="secretNote" label="Reason for the change">
        <Input
          id="secretNote"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={isVersion ? 'Quarterly rotation' : 'Optional'}
          autoComplete="off"
        />
      </FormField>
      <p className="text-xs text-text-muted">
        {isVersion
          ? `Saved as v${state.secret.latestVersion + 1}. Earlier versions stay in the history, so you can roll back.`
          : 'Stored encrypted (AES-256-GCM). Reading it later is recorded in the audit log.'}
      </p>
      <div className="flex justify-end gap-2">
        <LoadingButton variant="ghost" onClick={onClose}>
          Cancel
        </LoadingButton>
        <LoadingButton type="submit" state={saveState} loadingText="Saving" successText="Saved">
          {isVersion ? 'Save new version' : 'Add key'}
        </LoadingButton>
      </div>
    </form>
  )
}

/** Adds a key to `service`, or a new version of `state.secret`. */
export const SecretDialog = ({
  state,
  service,
  defaultTagId,
  tagName,
  onClose,
}: {
  state: SecretDialogState
  service: VaultService | null
  defaultTagId: number
  tagName: (id: number) => string
  onClose: () => void
}) => (
  <Dialog
    open={state.kind !== 'closed' && !!service}
    onClose={onClose}
    title={state.kind === 'version' ? `New version of ${state.secret.name}` : `New key in ${service?.serviceName}`}
    description={
      state.kind === 'version'
        ? `Tag: ${tagName(state.secret.tagId)}`
        : 'Keys are environment variables. The same name can have a different value per tag.'
    }
  >
    {state.kind !== 'closed' && service && (
      <SecretForm state={state} service={service} defaultTagId={defaultTagId} onClose={onClose} />
    )}
  </Dialog>
)

// ── History ──────────────────────────────────────────────

const SecretHistory = ({ secret }: { secret: SecretKey }) => {
  const { data: versions, isLoading } = useSecretVersions(secret.secretId)
  const [revealed, setRevealed] = useState<Record<number, string>>({})
  const { mutateAsync: rollback } = useRollbackSecret()
  const { mutateAsync: reveal } = useRevealSecret()
  const [rollbackState, runRollback] = useAsyncAction((version: number) => rollback({ secretId: secret.secretId, version }), {
    successMs: 600,
  })

  const toggle = async (version: number) => {
    if (revealed[version] !== undefined) {
      setRevealed((r) => {
        const next = { ...r }
        delete next[version]
        return next
      })
      return
    }
    try {
      const value = await reveal({ secretId: secret.secretId, version })
      setRevealed((r) => ({ ...r, [version]: value }))
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  if (isLoading || !versions) return <SkeletonText lines={4} />
  return (
    <ol className="flex flex-col gap-2">
      {versions.map((v) => {
        const current = v.version === secret.currentVersion
        return (
          <li key={v.version} className="rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-semibold text-text">v{v.version}</span>
              {current && <Badge tone="signal">In use</Badge>}
              {v.version === secret.latestVersion && !current && <Badge tone="warning">Latest, not in use</Badge>}
              <span className="text-xs text-text-muted" title={formatDateTime(v.createdAt)}>
                {v.createdBy} · {formatRelative(v.createdAt)}
              </span>
              <span className="ml-auto flex gap-1">
                <LoadingButton
                  variant="ghost"
                  size="sm"
                  icon={revealed[v.version] !== undefined ? <EyeOff size={14} /> : <Eye size={14} />}
                  aria-label={`${revealed[v.version] !== undefined ? 'Hide' : 'Reveal'} v${v.version}`}
                  onClick={() => toggle(v.version)}
                />
                {!current && (
                  <LoadingButton
                    variant="secondary"
                    size="sm"
                    icon={<RotateCcw size={13} />}
                    state={rollbackState}
                    onClick={() =>
                      runRollback(v.version)
                        .then(() => toast.success(`${secret.name} now uses v${v.version}.`))
                        .catch((err: Error) => toast.error(err.message))
                    }
                  >
                    Use this version
                  </LoadingButton>
                )}
              </span>
            </div>
            {v.note && <p className="mt-1 text-sm text-text-muted">{v.note}</p>}
            {revealed[v.version] !== undefined && (
              <code className="mt-2 block rounded-md bg-ink p-2 font-mono text-xs break-all text-text">
                {revealed[v.version]}
              </code>
            )}
          </li>
        )
      })}
    </ol>
  )
}

/** Every version of `secret`, newest first, with reveal and roll back. */
export const SecretHistoryDialog = ({
  secret,
  tagName,
  onClose,
}: {
  secret: SecretKey | null
  tagName: (id: number) => string
  onClose: () => void
}) => (
  <Dialog
    open={!!secret}
    onClose={onClose}
    size="lg"
    title={`History of ${secret?.name ?? ''}`}
    description={
      secret
        ? `Tag: ${tagName(secret.tagId)}. Versions can't be changed or deleted; rolling back just picks which one is in use.`
        : undefined
    }
  >
    {secret && <SecretHistory secret={secret} />}
  </Dialog>
)

// ── .env import ──────────────────────────────────────────

const ImportForm = ({
  service,
  existing,
  defaultTagId,
  onClose,
}: {
  service: VaultService
  existing: SecretKey[]
  defaultTagId: number
  onClose: () => void
}) => {
  const [tagId, setTagId] = useState(defaultTagId)
  const [text, setText] = useState('')
  const [note, setNote] = useState('')
  const [tagError, setTagError] = useState<string>()
  const { mutateAsync: runImport } = useImportDotenv()
  const [state, save] = useAsyncAction(() => runImport({ serviceId: service.serviceId, tagId, text, note }), { successMs: 500 })
  const parsed = useMemo(() => parseDotenv(text), [text])
  const names = new Set(existing.filter((s) => s.tagId === tagId).map((s) => s.name))
  const fresh = parsed.entries.filter((e) => !names.has(e.key)).length

  const loadFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) file.text().then(setText)
    e.target.value = ''
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!tagId) {
      setTagError('Pick a tag.')
      return
    }
    setTagError(undefined)
    save()
      .then((r) => {
        toast.success(`Imported: ${r.created} new, ${r.updated} changed, ${r.unchanged} unchanged.`)
        setTimeout(onClose, 500)
      })
      .catch((err: Error) => toast.error(err.message))
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <TagSelect id="importTag" value={tagId} onChange={setTagId} error={tagError} />
      <FormField
        id="importText"
        label=".env contents"
        labelExtra={
          <label className="flex cursor-pointer items-center gap-1 text-sm text-signal hover:text-signal-strong">
            <Upload size={13} />
            Choose file
            <input type="file" accept=".env,text/plain,*" className="sr-only" onChange={loadFile} />
          </label>
        }
      >
        <Textarea
          id="importText"
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'# Paste a .env file\nDATABASE_URL=postgres://…\nLOG_LEVEL=info'}
          className="font-mono text-xs"
          spellCheck={false}
        />
      </FormField>
      {text.trim() && (
        <p className={parsed.errors.length ? 'text-sm text-danger' : 'text-sm text-text-muted'} role="status">
          {parsed.errors.length
            ? `Line ${parsed.errors[0]!.line}: ${parsed.errors[0]!.message}.`
            : `${parsed.entries.length} keys: ${fresh} new, ${parsed.entries.length - fresh} already here (they get a new version if the value changed).`}
        </p>
      )}
      <FormField id="importNote" label="Reason">
        <Input
          id="importNote"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Imported from .env"
          autoComplete="off"
        />
      </FormField>
      <div className="flex justify-end gap-2">
        <LoadingButton variant="ghost" onClick={onClose}>
          Cancel
        </LoadingButton>
        <LoadingButton
          type="submit"
          state={state}
          loadingText="Importing"
          successText="Imported"
          disabled={!parsed.entries.length || parsed.errors.length > 0}
        >
          Import
        </LoadingButton>
      </div>
    </form>
  )
}

/** Paste or upload a .env file into `service` under one tag. */
export const ImportDotenvDialog = ({
  open,
  service,
  existing,
  defaultTagId,
  onClose,
}: {
  open: boolean
  service: VaultService | null
  existing: SecretKey[]
  defaultTagId: number
  onClose: () => void
}) => (
  <Dialog
    open={open && !!service}
    onClose={onClose}
    title={`Import .env into ${service?.serviceName}`}
    description="New names become keys; existing ones get a new version."
  >
    {service && <ImportForm service={service} existing={existing} defaultTagId={defaultTagId} onClose={onClose} />}
  </Dialog>
)

// ── .env export ──────────────────────────────────────────

const ExportForm = ({
  service,
  defaultTagId,
  tagName,
  onClose,
}: {
  service: VaultService
  defaultTagId: number
  tagName: (id: number) => string
  onClose: () => void
}) => {
  const [tagId, setTagId] = useState(defaultTagId)
  const { mutateAsync: runExport } = useExportDotenv()
  const [state, save] = useAsyncAction(() => runExport({ serviceId: service.serviceId, tagId }), { successMs: 500 })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    save()
      .then((body) => {
        downloadText(`${service.serviceName}.${tagName(tagId)}.env`, body)
        setTimeout(onClose, 500)
      })
      .catch((err: Error) => toast.error(err.message))
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <TagSelect id="exportTag" value={tagId} onChange={setTagId} />
      <p className="text-sm text-text-muted">
        Downloads the value in use for every key with this tag. The export is recorded in the audit log.
      </p>
      <div className="flex justify-end gap-2">
        <LoadingButton variant="ghost" onClick={onClose}>
          Cancel
        </LoadingButton>
        <LoadingButton type="submit" state={state} loadingText="Exporting" successText="Downloaded" disabled={!tagId}>
          Download .env
        </LoadingButton>
      </div>
    </form>
  )
}

/** Downloads one tag's keys from `service` as a .env file. */
export const ExportDotenvDialog = ({
  open,
  service,
  defaultTagId,
  tagName,
  onClose,
}: {
  open: boolean
  service: VaultService | null
  defaultTagId: number
  tagName: (id: number) => string
  onClose: () => void
}) => (
  <Dialog open={open && !!service} onClose={onClose} title={`Export ${service?.serviceName} as .env`}>
    {service && <ExportForm service={service} defaultTagId={defaultTagId} tagName={tagName} onClose={onClose} />}
  </Dialog>
)
