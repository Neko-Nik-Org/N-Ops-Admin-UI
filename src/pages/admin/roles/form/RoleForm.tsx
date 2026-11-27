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
 * Create / edit form for roles: details, permissions, tag scope, approvals and Linux users.
 * Like the API, it only offers permissions and tags the signed-in user has themselves.
 */

import { yupResolver } from '@hookform/resolvers/yup'
import { useAtomValue } from 'jotai'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'react-toastify'
import { Input } from '@/components/Input'
import { Switch } from '@/components/Switch'
import { Textarea } from '@/components/Textarea'
import { FormCard, FormFooter } from '@/components/FormCard'
import { FormField } from '@/components/FormField'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { ALL_PERMISSIONS } from '@/constants/permissions'
import { useCreateRole, useRoles, useUpdateRole } from '@/hooks/useRoles'
import { isWithinLimit } from '@/hooks/usePermissions'
import { currentUserAtom } from '@/store/session'
import { useTags } from '@/hooks/useTags'
import { PermissionMatrix } from '@/components/PermissionMatrix'
import { roleSchema, type RoleFormValues } from '@/pages/admin/roles/form/roleValidation'
import { splitList } from '@/utils/validation'
import { type Role, type RoleInput } from '@/types/role'
import { cn } from '@/utils/cn'

/**
 * Creates a role (optionally pre-filled from `template`, for Duplicate), or edits `role`.
 * `role` should be its latest saved state, so the save only sends what this edit changed.
 */
export const RoleForm = ({
  role,
  template,
  onSaved,
  onCancel,
}: {
  /** The role being edited; omit to create one. */
  role?: Role
  /** Pre-fills a new role (Duplicate). */
  template?: Role
  onSaved: (name: string) => void
  onCancel: () => void
}) => {
  const start = role ?? template
  const user = useAtomValue(currentUserAtom)
  // the API lists only the tags this user may access, which are exactly the ones they may grant
  const { data: tags = [] } = useTags()
  // used to catch duplicate names, which the API only reports as a database error
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
    formState: { errors, isDirty },
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
      allowedLinuxUsers: linuxUsers,
    })
      .then(() => {
        toast.success(role ? `Saved ${v.roleName}.` : `Created ${v.roleName}.`)
        setTimeout(() => onSaved(v.roleName), 500)
      })
      .catch((error: Error) => toast.error(error.message))
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <FormCard title="Details" hint="A role is a set of permissions. Each user gets one role.">
            <FormField id="roleName" required label="Name" error={errors.roleName?.message}>
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
              <Textarea
                id="roleDescription"
                rows={3}
                placeholder="What this role is for"
                hasError={!!errors.roleDescription}
                {...register('roleDescription')}
              />
            </FormField>
          </FormCard>

          <FormCard title="Limit to tags" hint="People with this role only see resources with the picked tags.">
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
                  ? `${selectedTags.length} picked.`
                  : tagLimited
                    ? "You're limited to some tags, so pick at least one."
                    : 'No tags picked: this role reaches every tag.'}
              </p>
            )}
          </FormCard>

          <FormCard title="Approvals">
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
          </FormCard>

          <FormCard title="Linux users">
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
          </FormCard>
        </div>

        <FormCard
          title="Permissions"
          required
          hint={
            user && ALL_PERMISSIONS.some((p) => !canGrant(p))
              ? 'You can only grant permissions your own role has, so only those modules are shown. The rest are greyed out.'
              : undefined
          }
          aside={<span className="text-xs text-text-muted">{selected.length} selected</span>}
        >
          <PermissionMatrix
            selected={selected}
            canGrant={canGrant}
            onChange={(next) => setValue('permissions', next, { shouldDirty: true, shouldValidate: true })}
          />
          {errors.permissions?.message && (
            <p className="text-sm text-danger" role="alert">
              {errors.permissions.message}
            </p>
          )}
        </FormCard>
      </div>

      <FormFooter
        state={state}
        dirty={isDirty}
        editing={!!role}
        idleNote="A name and at least one permission are required."
        submitLabel={role ? 'Save changes' : 'Create role'}
        loadingText={role ? 'Saving' : 'Creating'}
        successText={role ? 'Saved' : 'Created'}
        onCancel={onCancel}
      />
    </form>
  )
}
