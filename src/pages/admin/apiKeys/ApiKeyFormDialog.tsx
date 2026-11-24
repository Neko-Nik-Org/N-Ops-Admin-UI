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
/** Create / edit API key dialog, and the one-time "copy your key" dialog, for Admin › API keys. */

import { yupResolver } from '@hookform/resolvers/yup'
import { Check, Copy, Download, TriangleAlert } from 'lucide-react'
import moment from 'moment'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'react-toastify'
import { Input } from '@/components/Input'
import { Select } from '@/components/Select'
import { Switch } from '@/components/Switch'
import { Textarea } from '@/components/Textarea'
import { LoadingButton } from '@/components/LoadingButton'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { Dialog } from '@/components/Dialog'
import { FormField } from '@/components/FormField'
import { useCreateApiKey, useUpdateApiKey } from '@/hooks/useApiKeys'
import { useRoleOptions } from '@/hooks/useRoles'
import { useTagOptions } from '@/hooks/useTagOptions'
import { useVaultProjects } from '@/hooks/useVault'
import { cn } from '@/utils/cn'
import { apiKeySchema, type ApiKeyFormValues } from '@/pages/admin/apiKeys/apiKeyValidation'
import { type ApiKey, type ApiKeyInput, type CreatedApiKey } from '@/types/apiKey'
import { downloadText } from '@/utils/download'

/** Quick expiry choices, in days from today (null = never). */
const EXPIRY_PRESETS: Array<[string, number | null]> = [
  ['30 days', 30],
  ['90 days', 90],
  ['1 year', 365],
  ['Never', null],
]

/** The form; mounted only while the dialog is open. `onCreated` receives the new key and its secret. */
const ApiKeyForm = ({
  apiKey,
  onClose,
  onCreated,
}: {
  apiKey?: ApiKey
  onClose: () => void
  onCreated: (created: CreatedApiKey) => void
}) => {
  const { roles, canView: canViewRoles } = useRoleOptions()
  const { options: tags } = useTagOptions()
  const { data: projects = [] } = useVaultProjects()
  const { mutateAsync: create } = useCreateApiKey()
  const { mutateAsync: update } = useUpdateApiKey()
  const [state, save] = useAsyncAction(
    async (input: ApiKeyInput): Promise<CreatedApiKey | null> => {
      if (apiKey) {
        await update({ apiKeyId: apiKey.apiKeyId, input })
        return null
      }
      return create(input)
    },
    { successMs: 400 },
  )

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<ApiKeyFormValues>({
    resolver: yupResolver(apiKeySchema),
    defaultValues: {
      keyName: apiKey?.keyName ?? '',
      keyDescription: apiKey?.keyDescription ?? '',
      roleId: apiKey?.roleId ?? 0,
      tagId: apiKey?.tagId ?? 0,
      // checkbox values are strings in the DOM
      vaultProjectIds: (apiKey?.vaultProjectIds.map(String) ?? []) as unknown as number[],
      isActive: apiKey?.isActive ?? true,
      expiresOn: apiKey
        ? apiKey.expiresAt
          ? moment(apiKey.expiresAt).format('YYYY-MM-DD')
          : ''
        : moment().add(90, 'days').format('YYYY-MM-DD'),
    },
  })
  const expiresOn = useWatch({ control, name: 'expiresOn' })
  const roleId = Number(useWatch({ control, name: 'roleId' }))
  const role = roles.find((r) => r.roleId === roleId)
  const selectedProjects = (useWatch({ control, name: 'vaultProjectIds' }) ?? []).map(Number)

  const onSubmit = (v: ApiKeyFormValues) =>
    save({
      keyName: v.keyName,
      keyDescription: v.keyDescription,
      roleId: Number(v.roleId),
      tagId: Number(v.tagId),
      vaultProjectIds: v.vaultProjectIds.map(Number),
      isActive: v.isActive,
      expiresAt: v.expiresOn ? moment(v.expiresOn).endOf('day').toISOString() : null,
    })
      .then((created) => {
        if (created) {
          onCreated(created)
          return
        }
        toast.success(`Saved ${v.keyName}.`)
        setTimeout(onClose, 400)
      })
      .catch((error: Error) => toast.error(error.message))

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <FormField id="keyName" label="Name" error={errors.keyName?.message}>
        <Input
          id="keyName"
          placeholder="github-actions-prod"
          autoComplete="off"
          spellCheck={false}
          hasError={!!errors.keyName}
          {...register('keyName')}
        />
      </FormField>
      <FormField id="keyDescription" label="What is it for?" error={errors.keyDescription?.message}>
        <Textarea
          id="keyDescription"
          rows={2}
          placeholder="Production deploys read secrets at release time."
          hasError={!!errors.keyDescription}
          {...register('keyDescription')}
        />
      </FormField>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField id="roleId" label="Role" error={errors.roleId?.message}>
          <Select id="roleId" hasError={!!errors.roleId} {...register('roleId')}>
            <option value={0} disabled>
              Pick a role
            </option>
            {roles.map((r) => (
              <option key={r.roleId} value={r.roleId}>
                {r.roleName}
              </option>
            ))}
          </Select>
          {!roles.length && (
            <p className="text-xs text-text-muted">
              {canViewRoles
                ? 'There are no roles yet. Create one on the Roles page.'
                : 'You need the “View roles” permission (user:role:view) to pick a role.'}
            </p>
          )}
        </FormField>
        <FormField id="tagId" label="Tag" error={errors.tagId?.message}>
          <Select id="tagId" hasError={!!errors.tagId} {...register('tagId')}>
            <option value={0} disabled>
              {tags.length ? 'Pick a tag' : 'No tags yet: create one on the Tags page'}
            </option>
            {tags.map((t) => (
              <option key={t.tagId} value={t.tagId}>
                {t.tagName}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      <p className="-mt-2 text-xs text-text-muted">
        {role
          ? `Acts with the ${role.roleName} role's ${role.permissions.length} permission${role.permissions.length === 1 ? '' : 's'}, only on resources with this tag.`
          : 'The key acts with the role’s permissions, only on resources with the tag you pick.'}
      </p>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm text-text-muted">Vault projects</legend>
        {!projects.length && (
          <p className="text-xs text-text-muted">There are no vault projects yet. Create one in the Vault first.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {projects.map((p) => {
            const on = selectedProjects.includes(p.projectId)
            return (
              <label
                key={p.projectId}
                className={cn(
                  'cursor-pointer rounded-full border px-3 py-1 font-mono text-xs transition-colors has-[:focus-visible]:border-signal',
                  on ? 'border-signal bg-signal/15 text-signal' : 'border-border text-text-muted hover:border-border-strong',
                )}
              >
                <input type="checkbox" value={p.projectId} className="sr-only" {...register('vaultProjectIds')} />
                {p.projectName}
              </label>
            )
          })}
        </div>
        {errors.vaultProjectIds?.message ? (
          <p className="text-sm text-danger" role="alert">
            {errors.vaultProjectIds.message}
          </p>
        ) : (
          <p className="text-xs text-text-muted">
            The key can read keys and config files in these projects only (with the tag above).
          </p>
        )}
      </fieldset>

      <FormField id="expiresOn" label="Expires" error={errors.expiresOn?.message}>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id="expiresOn"
            type="date"
            min={moment().add(1, 'day').format('YYYY-MM-DD')}
            className="w-44"
            hasError={!!errors.expiresOn}
            {...register('expiresOn')}
          />
          {EXPIRY_PRESETS.map(([label, days]) => (
            <button
              key={label}
              type="button"
              onClick={() =>
                setValue('expiresOn', days === null ? '' : moment().add(days, 'days').format('YYYY-MM-DD'), {
                  shouldValidate: true,
                })
              }
              className="rounded-full border border-border px-2.5 py-1 text-xs text-text-muted hover:border-border-strong hover:text-text"
            >
              {label}
            </button>
          ))}
        </div>
        {!errors.expiresOn && (
          <p className="text-xs text-text-muted">
            {expiresOn ? `Stops working ${moment(expiresOn).endOf('day').fromNow()}.` : 'Never expires. Rotate it by hand.'}
          </p>
        )}
      </FormField>

      {apiKey && (
        <Switch
          label="Active"
          description="A disabled key is rejected but kept, so you can turn it back on."
          {...register('isActive')}
        />
      )}

      <div className="flex justify-end gap-2 pt-1">
        <LoadingButton variant="ghost" onClick={onClose}>
          Cancel
        </LoadingButton>
        <LoadingButton
          type="submit"
          state={state}
          loadingText={apiKey ? 'Saving' : 'Creating'}
          successText={apiKey ? 'Saved' : 'Created'}
        >
          {apiKey ? 'Save changes' : 'Create key'}
        </LoadingButton>
      </div>
    </form>
  )
}

/** Shows a new key's secret once, with copy and download. */
const SecretView = ({ created, onClose }: { created: CreatedApiKey; onClose: () => void }) => {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(created.secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Couldn't copy. Select the key and copy it by hand.")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
        <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        Copy this key now. It's only shown once; afterwards only its first characters are visible.
      </div>
      <code
        data-testid="api-key-secret"
        className="block rounded-md border border-border bg-ink p-3 font-mono text-sm break-all text-text select-all"
      >
        {created.secret}
      </code>
      <div className="flex flex-wrap justify-end gap-2">
        <LoadingButton
          variant="secondary"
          icon={<Download size={14} />}
          onClick={() => downloadText(`${created.apiKey.keyName}.txt`, `${created.secret}\n`)}
        >
          Download
        </LoadingButton>
        <LoadingButton variant="secondary" icon={copied ? <Check size={14} /> : <Copy size={14} />} onClick={copy}>
          {copied ? 'Copied' : 'Copy key'}
        </LoadingButton>
        <LoadingButton onClick={onClose}>Done</LoadingButton>
      </div>
    </div>
  )
}

/** Creates a key (then shows its secret once), or edits `apiKey` when given. */
export const ApiKeyFormDialog = ({ open, apiKey, onClose }: { open: boolean; apiKey?: ApiKey; onClose: () => void }) => {
  const [created, setCreated] = useState<CreatedApiKey | null>(null)
  const close = () => {
    setCreated(null)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title={created ? `${created.apiKey.keyName} is ready` : apiKey ? `Edit ${apiKey.keyName}` : 'New API key'}
      description={created || apiKey ? undefined : 'For scripts and pipelines that read the Vault. Give each one its own key.'}
    >
      {created ? (
        <SecretView created={created} onClose={close} />
      ) : (
        <ApiKeyForm apiKey={apiKey} onClose={close} onCreated={setCreated} />
      )}
    </Dialog>
  )
}
