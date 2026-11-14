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
/** Create / edit role dialog for Admin › Roles: permissions, tag scope, approvals and Linux users. */

import { yupResolver } from '@hookform/resolvers/yup'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'react-toastify'
import { Input } from '@/components/atoms/Input'
import { Switch } from '@/components/atoms/Switch'
import { Textarea } from '@/components/atoms/Textarea'
import { LoadingButton, useAsyncAction } from '@/components/loading'
import { Dialog } from '@/components/molecules/Dialog'
import { FormField } from '@/components/molecules/FormField'
import { PERMISSION_GROUPS } from '@/features/admin/catalog'
import { useCreateRole, useUpdateRole } from '@/features/admin/hooks/useAdmin'
import { useTagOptions } from '@/features/admin/hooks/useTagOptions'
import { roleSchema, splitList, type RoleFormValues } from '@/features/admin/schema/adminSchemas'
import type { Role, RoleInput } from '@/features/admin/types'
import { cn } from '@/utils/cn'

/** The form; mounted only while the dialog is open. */
const RoleForm = ({ role, template, onClose }: { role?: Role; template?: Role; onClose: () => void }) => {
  const start = role ?? template
  const { options: tags } = useTagOptions()
  const { mutateAsync: create } = useCreateRole()
  const { mutateAsync: update } = useUpdateRole()
  const [state, save] = useAsyncAction(
    async (input: RoleInput): Promise<void> => {
      if (role) await update({ roleId: role.roleId, input })
      else await create(input)
    },
    { successMs: 500 },
  )

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<RoleFormValues>({
    resolver: yupResolver(roleSchema),
    defaultValues: {
      roleName: start?.roleName ?? '',
      roleDescription: start?.roleDescription ?? '',
      permissions: start?.permissions ?? [],
      // checkbox values are strings in the DOM
      tagIds: (start?.tagIds.map(String) ?? []) as unknown as number[],
      canApproveApprovals: start?.canApproveApprovals ?? false,
      canBypassApprovals: start?.canBypassApprovals ?? false,
      allowedLinuxUsers: start?.allowedLinuxUsers.join(', ') ?? '',
    },
  })

  const selected = useWatch({ control, name: 'permissions' }) ?? []
  const selectedTags = (useWatch({ control, name: 'tagIds' }) ?? []).map(Number)

  /** Ticks or clears a whole permission group. */
  const toggleGroup = (keys: string[], on: boolean) => {
    const rest = selected.filter((p) => !keys.includes(p))
    setValue('permissions', on ? [...rest, ...keys] : rest, { shouldDirty: true, shouldValidate: true })
  }

  const onSubmit = (v: RoleFormValues) =>
    save({
      roleName: v.roleName,
      roleDescription: v.roleDescription,
      permissions: v.permissions,
      tagIds: v.tagIds.map(Number),
      canApproveApprovals: v.canApproveApprovals,
      canBypassApprovals: v.canBypassApprovals,
      allowedLinuxUsers: splitList(v.allowedLinuxUsers),
    })
      .then(() => {
        toast.success(role ? `Saved ${v.roleName}.` : `Created ${v.roleName}.`)
        setTimeout(onClose, 500)
      })
      .catch((error: Error) => toast.error(error.message))

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-col gap-5" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_2fr]">
        <FormField id="roleName" label="Name" error={errors.roleName?.message}>
          <Input id="roleName" placeholder="Operator" autoComplete="off" hasError={!!errors.roleName} {...register('roleName')} />
        </FormField>
        <FormField id="roleDescription" label="Description" error={errors.roleDescription?.message}>
          <Input id="roleDescription" placeholder="What this role is for" autoComplete="off" {...register('roleDescription')} />
        </FormField>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 flex w-full items-baseline justify-between gap-2 text-sm text-text-muted">
          <span>Permissions</span>
          <span className="text-xs">{selected.length} selected</span>
        </legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PERMISSION_GROUPS.map((group) => {
            const keys = group.permissions.map((p) => p.key)
            const count = keys.filter((k) => selected.includes(k)).length
            return (
              <div key={group.label} className="rounded-lg border border-border p-3">
                <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm font-medium text-text">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--color-signal)]"
                    checked={count === keys.length}
                    ref={(el) => {
                      if (el) el.indeterminate = count > 0 && count < keys.length
                    }}
                    onChange={(e) => toggleGroup(keys, e.target.checked)}
                    aria-label={`All ${group.label} permissions`}
                  />
                  {group.label}
                </label>
                <div className="flex flex-col gap-1.5 pl-6">
                  {group.permissions.map((p) => (
                    <label key={p.key} className="flex cursor-pointer items-center gap-2 text-sm text-text-muted">
                      <input type="checkbox" value={p.key} className="size-3.5 accent-[var(--color-signal)]" {...register('permissions')} />
                      <span className="text-text">{p.label}</span>
                      <code className="ml-auto hidden font-mono text-[0.6875rem] text-text-muted sm:inline">{p.key}</code>
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        {errors.permissions?.message && (
          <p className="text-sm text-danger" role="alert">
            {errors.permissions.message}
          </p>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm text-text-muted">Limit to tags</legend>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => {
            const on = selectedTags.includes(tag.tagId)
            return (
              <label
                key={tag.tagId}
                className={cn(
                  'cursor-pointer rounded-full border px-3 py-1 font-mono text-xs transition-colors has-[:focus-visible]:border-signal',
                  on ? 'border-accent-secondary bg-accent-secondary/15 text-accent-secondary' : 'border-border text-text-muted hover:border-border-strong',
                )}
              >
                <input type="checkbox" value={tag.tagId} className="sr-only" {...register('tagIds')} />
                {tag.tagName}
              </label>
            )
          })}
        </div>
        <p className="text-xs text-text-muted">
          {selectedTags.length ? 'People with this role only see resources with these tags.' : 'No tags picked: this role reaches every tag.'}
        </p>
      </fieldset>

      <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <Switch label="Can approve requests" description="Approve or reject other people's approval requests." {...register('canApproveApprovals')} />
        <Switch
          label="Skips approvals"
          description="Sensitive commands run without waiting for approval. Give this sparingly."
          {...register('canBypassApprovals')}
        />
      </div>

      <FormField id="allowedLinuxUsers" label="Allowed Linux users" error={errors.allowedLinuxUsers?.message}>
        <Textarea
          id="allowedLinuxUsers"
          rows={2}
          placeholder="deploy, ubuntu"
          className="font-mono"
          hasError={!!errors.allowedLinuxUsers}
          {...register('allowedLinuxUsers')}
        />
        {!errors.allowedLinuxUsers && <p className="text-xs text-text-muted">Accounts this role may SSH in as, separated by commas. Leave empty for none.</p>}
      </FormField>

      <div className="flex justify-end gap-2">
        <LoadingButton variant="ghost" onClick={onClose}>
          Cancel
        </LoadingButton>
        <LoadingButton type="submit" state={state} loadingText={role ? 'Saving' : 'Creating'} successText={role ? 'Saved' : 'Created'}>
          {role ? 'Save changes' : 'Create role'}
        </LoadingButton>
      </div>
    </form>
  )
}

/** Creates a role (optionally from `template`), or edits `role` when given. */
export const RoleFormDialog = ({
  open,
  role,
  template,
  onClose,
}: {
  open: boolean
  /** The role being edited; omit to create one. */
  role?: Role
  /** Pre-fills a new role (Duplicate). */
  template?: Role
  onClose: () => void
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    size="lg"
    title={role ? `Edit ${role.roleName}` : 'New role'}
    description="A role is a set of permissions. Users and API keys each get one role."
  >
    <RoleForm role={role} template={template} onClose={onClose} />
  </Dialog>
)
