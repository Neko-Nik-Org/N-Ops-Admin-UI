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
 * Create / edit role dialog for Admin › Roles: permissions, tag scope, approvals and Linux users.
 * Like the API, it only offers permissions and tags the signed-in user has themselves.
 */

import { yupResolver } from '@hookform/resolvers/yup'
import { useAtomValue } from 'jotai'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'react-toastify'
import { Input } from '@/components/atoms/Input'
import { Switch } from '@/components/atoms/Switch'
import { Textarea } from '@/components/atoms/Textarea'
import { LoadingButton } from '@/components/molecules/LoadingButton'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { Dialog } from '@/components/molecules/Dialog'
import { Skeleton } from '@/components/molecules/Skeleton'
import { FormField } from '@/components/molecules/FormField'
import { ALL_PERMISSIONS, PERMISSION_GROUPS } from '@/features/admin/catalog'
import { useCreateRole, useRole, useRoles, useUpdateRole } from '@/features/admin/hooks/useAdmin'
import { isWithinLimit } from '@/features/auth/permissions'
import { currentUserAtom } from '@/features/auth/store/session'
import { useTags } from '@/features/tags/hooks/useTags'
import { roleSchema, splitList, type RoleFormValues } from '@/features/admin/schema/adminSchemas'
import type { Role, RoleInput } from '@/features/admin/types'
import { cn } from '@/utils/cn'

/** The form; mounted only while the dialog is open. */
const RoleForm = ({ role, template, onClose }: { role?: Role; template?: Role; onClose: () => void }) => {
  const start = role ?? template
  const user = useAtomValue(currentUserAtom)
  // the API lists only the tags this user may access, which are exactly the ones they may grant
  const { data: tags = [] } = useTags()
  // already cached by the Roles page; used to catch duplicate names, which the API only reports as a database error
  const { data: existingRoles = [] } = useRoles()
  /** Unknown profile (e.g. storage blocked): offer everything and let the API decide. */
  const canGrant = (permission: string) => !user || user.permissions.includes(permission)
  const tagLimited = !!user && user.tags.length > 0
  /** Linux accounts the user may hand out; empty = no limit, undefined = not known yet (API decides). */
  const ownLinuxUsers = user?.allowedLinuxUsers ?? []
  const linuxLimited = ownLinuxUsers.length > 0
  const { mutateAsync: create } = useCreateRole()
  const { mutateAsync: update } = useUpdateRole()
  const [state, save] = useAsyncAction(
    async (input: RoleInput): Promise<void> => {
      if (role) await update({ role, input })
      else await create(input)
    },
    { successMs: 500 },
  )

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
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

  /** Ticks or clears the grantable permissions of a group. */
  const toggleGroup = (keys: string[], on: boolean) => {
    const rest = selected.filter((p) => !keys.includes(p))
    setValue('permissions', on ? [...rest, ...keys] : rest, { shouldDirty: true, shouldValidate: true })
  }

  const onSubmit = (v: RoleFormValues) => {
    // role names are unique per organization (case-sensitive, like the database constraint)
    if (existingRoles.some((r) => r.roleId !== role?.roleId && r.roleName === v.roleName)) {
      setError('roleName', { message: `A role called "${v.roleName}" already exists.` })
      return
    }
    // the API refuses an unrestricted role from someone who is limited to some tags
    if (tagLimited && !v.tagIds.length) {
      setError('tagIds', { message: "You're limited to some tags, so pick at least one." })
      return
    }
    const linuxUsers = splitList(v.allowedLinuxUsers)
    if (!isWithinLimit(ownLinuxUsers, linuxUsers)) {
      setError('allowedLinuxUsers', { message: `Pick from the Linux users you have yourself: ${ownLinuxUsers.join(', ')}.` })
      return
    }
    return save({
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
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-col gap-5" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_2fr]">
        <FormField id="roleName" label="Name" error={errors.roleName?.message}>
          <Input
            id="roleName"
            placeholder="Operator"
            autoComplete="off"
            maxLength={100}
            hasError={!!errors.roleName}
            {...register('roleName')}
          />
        </FormField>
        <FormField id="roleDescription" label="Description" error={errors.roleDescription?.message}>
          <Input
            id="roleDescription"
            placeholder="What this role is for"
            autoComplete="off"
            hasError={!!errors.roleDescription}
            {...register('roleDescription')}
          />
        </FormField>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 flex w-full items-baseline justify-between gap-2 text-sm text-text-muted">
          <span>Permissions</span>
          <span className="text-xs">{selected.length} selected</span>
        </legend>
        {user && ALL_PERMISSIONS.some((p) => !canGrant(p)) && (
          <p className="-mt-1 text-xs text-text-muted">
            You can only grant permissions your own role has. The rest are greyed out.
          </p>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PERMISSION_GROUPS.map((group) => {
            const keys = group.permissions.map((p) => p.key).filter(canGrant)
            const count = keys.filter((k) => selected.includes(k)).length
            return (
              <div key={group.label} className="rounded-lg border border-border p-3">
                <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm font-medium text-text">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--color-signal)]"
                    checked={keys.length > 0 && count === keys.length}
                    disabled={!keys.length}
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
                    <label
                      key={p.key}
                      className={cn(
                        'flex items-center gap-2 text-sm text-text-muted',
                        canGrant(p.key) ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
                      )}
                      title={canGrant(p.key) ? undefined : "Your role doesn't have this permission"}
                    >
                      <input
                        type="checkbox"
                        value={p.key}
                        disabled={!canGrant(p.key)}
                        className="size-3.5 accent-[var(--color-signal)]"
                        {...register('permissions')}
                      />
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
        {!tags.length && <p className="text-xs text-text-muted">There are no tags yet. Create some on the Tags page.</p>}
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => {
            const on = selectedTags.includes(tag.tagId)
            return (
              <label
                key={tag.tagId}
                className={cn(
                  'cursor-pointer rounded-full border px-3 py-1 font-mono text-xs transition-colors has-[:focus-visible]:border-signal',
                  on
                    ? 'border-accent-secondary bg-accent-secondary/15 text-accent-secondary'
                    : 'border-border text-text-muted hover:border-border-strong',
                )}
              >
                <input type="checkbox" value={tag.tagId} className="sr-only" {...register('tagIds')} />
                {tag.tagName}
              </label>
            )
          })}
        </div>
        {errors.tagIds?.message ? (
          <p className="text-sm text-danger" role="alert">
            {errors.tagIds.message}
          </p>
        ) : (
          <p className="text-xs text-text-muted">
            {selectedTags.length
              ? 'People with this role only see resources with these tags.'
              : tagLimited
                ? "You're limited to some tags, so pick at least one."
                : 'No tags picked: this role reaches every tag.'}
          </p>
        )}
      </fieldset>

      <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <Switch
          label="Can approve requests"
          description={
            user?.canApproveApprovals === false
              ? "Only someone who can approve requests can give this. Your role can't."
              : "Approve or reject other people's approval requests."
          }
          disabled={user?.canApproveApprovals === false}
          {...register('canApproveApprovals')}
        />
        <Switch
          label="Skips approvals"
          description={
            user?.canBypassApprovals === false
              ? "Only someone who skips approvals can give this. Your role can't."
              : 'Sensitive commands run without waiting for approval. Give this sparingly.'
          }
          disabled={user?.canBypassApprovals === false}
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
        {!errors.allowedLinuxUsers && (
          <p className="text-xs text-text-muted">
            {linuxLimited
              ? `Accounts this role may SSH in as, separated by commas. You can give: ${ownLinuxUsers.join(', ')}.`
              : 'Accounts this role may SSH in as, separated by commas. Leave empty for any.'}
          </p>
        )}
      </FormField>

      <div className="flex justify-end gap-2">
        <LoadingButton variant="ghost" onClick={onClose}>
          Cancel
        </LoadingButton>
        <LoadingButton
          type="submit"
          state={state}
          loadingText={role ? 'Saving' : 'Creating'}
          successText={role ? 'Saved' : 'Created'}
        >
          {role ? 'Save changes' : 'Create role'}
        </LoadingButton>
      </div>
    </form>
  )
}

/**
 * Edits `role` starting from its latest saved state, so the save only sends what this edit changed.
 * If that fetch fails the form falls back to the copy from the list.
 */
const EditRoleForm = ({ role, onClose }: { role: Role; onClose: () => void }) => {
  const { data: latest, isPending } = useRole(role.roleId)
  if (isPending)
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading role">
        <Skeleton height={40} />
        <Skeleton height={192} />
      </div>
    )
  return <RoleForm role={latest ?? role} onClose={onClose} />
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
    description="A role is a set of permissions. Each user gets one role."
  >
    {open && role ? <EditRoleForm role={role} onClose={onClose} /> : <RoleForm template={template} onClose={onClose} />}
  </Dialog>
)
