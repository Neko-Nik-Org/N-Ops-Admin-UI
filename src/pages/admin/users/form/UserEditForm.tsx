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
 * Edit-user form for Admin › Users: name, email, role, access policy and profile details in one
 * place. A save only calls the endpoints whose fields changed: `PUT /user/admin/update/{id}` for the
 * name, email and details, and the role / policy endpoints for access. Username and password have
 * their own dialogs on the user's page.
 */

import { yupResolver } from '@hookform/resolvers/yup'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { FormCard, FormFooter } from '@/components/FormCard'
import { FormField } from '@/components/FormField'
import { Input } from '@/components/Input'
import { ProfileDetailsFields } from '@/components/ProfileDetailsFields'
import { Select } from '@/components/Select'
import { useAccessPolicies } from '@/hooks/useAccessPolicies'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { useHasPermissions } from '@/hooks/usePermissions'
import { useRoleOptions } from '@/hooks/useRoles'
import { useAdminUsers, useUpdateUserAccess, useUpdateUserProfile } from '@/hooks/useUsers'
import { userEditSchema, type UserEditFormValues } from '@/pages/admin/users/form/userValidation'
import { type AdminUser } from '@/types/user'
import { parseProfileDetails, serializeProfileDetails } from '@/utils/profileDetails'
import { fromDetailsForm, toDetailsForm } from '@/utils/profileDetailsForm'

/** Edits `user`, which should be their latest saved state. */
export const UserEditForm = ({ user, onSaved, onCancel }: { user: AdminUser; onSaved: () => void; onCancel: () => void }) => {
  const { roles, canView: canViewRoles } = useRoleOptions()
  const canViewPolicies = useHasPermissions('policy:ar:view')
  const { data: policies = [] } = useAccessPolicies({ enabled: canViewPolicies })
  const { data: users = [] } = useAdminUsers()
  // values the details editor doesn't show are saved back unchanged
  const { details: saved, preserved } = useMemo(() => parseProfileDetails(user.userDetails), [user.userDetails])
  const { mutateAsync: updateProfile } = useUpdateUserProfile()
  const { mutateAsync: updateAccess } = useUpdateUserAccess()

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<UserEditFormValues>({
    resolver: yupResolver(userEditSchema),
    defaultValues: {
      displayName: user.displayName,
      primaryEmail: user.primaryEmail,
      roleId: user.roleId,
      accessPolicyId: user.accessPolicyId ?? 0,
      details: toDetailsForm(saved),
    },
  })

  const [state, save] = useAsyncAction(
    async ({ v, detailsChanged }: { v: UserEditFormValues; detailsChanged: boolean }): Promise<void> => {
      const roleId = Number(v.roleId)
      const accessPolicyId = Number(v.accessPolicyId) || null
      const profileChanged = v.displayName !== user.displayName || v.primaryEmail !== user.primaryEmail || detailsChanged
      if (profileChanged)
        await updateProfile({
          user,
          input: {
            displayName: v.displayName,
            primaryEmail: v.primaryEmail,
            userDetails: detailsChanged ? serializeProfileDetails(fromDetailsForm(v.details), preserved) : user.userDetails,
          },
        })
      if (roleId !== user.roleId || accessPolicyId !== user.accessPolicyId) await updateAccess({ user, roleId, accessPolicyId })
    },
    { successMs: 500 },
  )

  const onSubmit = (v: UserEditFormValues) => {
    if (!isDirty) {
      onCancel()
      return
    }
    const email = v.primaryEmail.toLowerCase()
    // the API reports a taken email only as a bare database error, so check first
    if (users.some((u) => u.userId !== user.userId && u.primaryEmail.toLowerCase() === email)) {
      setError('primaryEmail', { message: 'Someone in your organization already uses this email.' })
      return
    }
    return save({ v, detailsChanged: !!dirtyFields.details })
      .then(() => {
        toast.success(`Saved ${v.displayName}.`)
        setTimeout(onSaved, 500)
      })
      .catch((error: Error) => toast.error(error.message))
  }

  // the current role and policy stay pickable even when the lists can't be loaded
  const roleKnown = roles.some((r) => r.roleId === user.roleId)
  const policyKnown = user.accessPolicyId === null || policies.some((p) => p.policyId === user.accessPolicyId)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <FormCard title="Account" hint={`Signs in as @${user.userName}. Change that from their page.`}>
            <FormField id="editDisplayName" label="Name" error={errors.displayName?.message}>
              <Input id="editDisplayName" autoComplete="off" hasError={!!errors.displayName} {...register('displayName')} />
            </FormField>
            <FormField id="editPrimaryEmail" label="Email" error={errors.primaryEmail?.message}>
              <Input
                id="editPrimaryEmail"
                type="email"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                hasError={!!errors.primaryEmail}
                {...register('primaryEmail')}
              />
              {!errors.primaryEmail && <p className="text-xs text-text-muted">A new email needs verifying again.</p>}
            </FormField>
          </FormCard>

          <FormCard
            title="Access"
            hint="Someone who's signed in gets a change when they next sign in or their session refreshes."
          >
            <FormField id="editRoleId" label="Role" error={errors.roleId?.message}>
              <Select id="editRoleId" disabled={!canViewRoles} hasError={!!errors.roleId} {...register('roleId')}>
                {!roleKnown && <option value={user.roleId}>Role #{user.roleId}</option>}
                {roles.map((r) => (
                  <option key={r.roleId} value={r.roleId}>
                    {r.roleName}
                  </option>
                ))}
              </Select>
              {!canViewRoles && (
                <p className="text-xs text-text-muted">You need the “View roles” permission (user:role:view) to change roles.</p>
              )}
            </FormField>
            <FormField id="editAccessPolicyId" label="Access policy">
              <Select id="editAccessPolicyId" disabled={!canViewPolicies} {...register('accessPolicyId')}>
                <option value={0}>No access policy</option>
                {!policyKnown && <option value={user.accessPolicyId!}>Policy #{user.accessPolicyId}</option>}
                {policies.map((p) => (
                  <option key={p.policyId} value={p.policyId}>
                    {p.policyName}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-text-muted">
                {canViewPolicies
                  ? 'Sets the 2FA they must use and where they can sign in from.'
                  : 'You need the “View access policies” permission (policy:ar:view) to change policies.'}
              </p>
            </FormField>
          </FormCard>
        </div>

        <FormCard title="Profile details" hint="Work, contact, availability and engineering details. Everything is optional.">
          <ProfileDetailsFields
            register={register}
            control={control}
            errors={errors.details}
            prefix="details."
            timezone={saved.availability.timezone}
            preservedCount={Object.keys(preserved).length}
          />
        </FormCard>
      </div>

      <FormFooter
        state={state}
        dirty={isDirty}
        editing
        submitLabel="Save changes"
        loadingText="Saving"
        successText="Saved"
        onCancel={onCancel}
      />
    </form>
  )
}
