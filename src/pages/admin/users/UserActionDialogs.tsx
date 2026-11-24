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
 * Dialogs an admin uses on another user: edit their name, email and profile details, change their
 * role and access policy, change their username, set a new password.
 */

import { yupResolver } from '@hookform/resolvers/yup'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { Input } from '@/components/Input'
import { Select } from '@/components/Select'
import { Dialog } from '@/components/Dialog'
import { FormField } from '@/components/FormField'
import { LoadingButton } from '@/components/LoadingButton'
import { isUsernameAvailable } from '@/api/account'
import { ProfileDetailsDialog } from '@/components/ProfileDetailsDialog'
import { useAccessPolicies } from '@/hooks/useAccessPolicies'
import { useChangeUserName, useResetUserPassword, useUpdateUserAccess, useUpdateUserProfile } from '@/hooks/useUsers'
import { useRoleOptions } from '@/hooks/useRoles'
import {
  adminProfileSchema,
  renameUserSchema,
  resetPasswordSchema,
  userAccessSchema,
  type AdminProfileFormValues,
  type RenameUserFormValues,
  type ResetPasswordFormValues,
  type UserAccessFormValues,
} from '@/pages/admin/users/userValidation'
import { useHasPermissions } from '@/hooks/usePermissions'
import { type AdminUser } from '@/types/user'
import { useAsyncAction } from '@/hooks/useAsyncAction'

const Buttons = ({
  onClose,
  state,
  label,
}: {
  onClose: () => void
  state: ReturnType<typeof useAsyncAction>[0]
  label: string
}) => (
  <div className="flex justify-end gap-2 pt-1">
    <LoadingButton variant="ghost" onClick={onClose}>
      Cancel
    </LoadingButton>
    <LoadingButton type="submit" state={state} loadingText="Saving" successText="Saved">
      {label}
    </LoadingButton>
  </div>
)

const RenameForm = ({ user, onClose }: { user: AdminUser; onClose: () => void }) => {
  const { mutateAsync: rename } = useChangeUserName()
  const [state, save] = useAsyncAction(rename, { successMs: 500 })
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RenameUserFormValues>({
    resolver: yupResolver(renameUserSchema),
    context: { currentUserName: user.userName },
    defaultValues: { userName: user.userName },
  })

  const onSubmit = async ({ userName }: RenameUserFormValues) => {
    try {
      if (!(await isUsernameAvailable(userName))) {
        setError('userName', { message: 'That username is taken.' })
        return
      }
    } catch {
      // only a courtesy check; the API refuses a taken name too
    }
    try {
      await save({ userId: user.userId, userName })
      toast.success(`${user.displayName} now signs in as @${userName}.`)
      setTimeout(onClose, 500)
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <FormField id="newUserName" label="New username" error={errors.userName?.message}>
        <Input
          id="newUserName"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          hasError={!!errors.userName}
          {...register('userName')}
        />
      </FormField>
      <p className="-mt-2 text-xs text-text-muted">They'll need to sign in with the new username from now on.</p>
      <Buttons onClose={onClose} state={state} label="Change username" />
    </form>
  )
}

const ResetPasswordForm = ({ user, onClose }: { user: AdminUser; onClose: () => void }) => {
  const { mutateAsync: reset } = useResetUserPassword()
  const [state, save] = useAsyncAction(reset, { successMs: 500 })
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: yupResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const onSubmit = ({ password }: ResetPasswordFormValues) =>
    save({ userId: user.userId, password })
      .then(() => {
        toast.success(`Set a new password for ${user.displayName}.`)
        setTimeout(onClose, 500)
      })
      .catch((error: Error) => toast.error(error.message))

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <FormField id="resetPassword" label="New password" error={errors.password?.message}>
        <Input
          id="resetPassword"
          type="password"
          autoComplete="new-password"
          hasError={!!errors.password}
          {...register('password')}
        />
      </FormField>
      <FormField id="resetConfirmPassword" label="Confirm password" error={errors.confirmPassword?.message}>
        <Input
          id="resetConfirmPassword"
          type="password"
          autoComplete="new-password"
          hasError={!!errors.confirmPassword}
          {...register('confirmPassword')}
        />
      </FormField>
      <p className="-mt-2 text-xs text-text-muted">
        8–64 characters with an uppercase letter, a lowercase letter, a digit and a symbol. They aren't emailed, so share it with
        them yourself.
      </p>
      <Buttons onClose={onClose} state={state} label="Set password" />
    </form>
  )
}

export const RenameUserDialog = ({ user, onClose }: { user: AdminUser | null; onClose: () => void }) => (
  <Dialog open={!!user} onClose={onClose} title={user ? `Change ${user.displayName}'s username` : ''}>
    {user && <RenameForm user={user} onClose={onClose} />}
  </Dialog>
)

export const ResetPasswordDialog = ({ user, onClose }: { user: AdminUser | null; onClose: () => void }) => (
  <Dialog open={!!user} onClose={onClose} title={user ? `Reset ${user.displayName}'s password` : ''}>
    {user && <ResetPasswordForm user={user} onClose={onClose} />}
  </Dialog>
)

// ── name and email ───────────────────────────────────────

const ProfileForm = ({ user, onClose }: { user: AdminUser; onClose: () => void }) => {
  const { mutateAsync: update } = useUpdateUserProfile()
  const [state, save] = useAsyncAction(update, { successMs: 500 })
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminProfileFormValues>({
    resolver: yupResolver(adminProfileSchema),
    defaultValues: { displayName: user.displayName, primaryEmail: user.primaryEmail },
  })

  const onSubmit = (v: AdminProfileFormValues) =>
    save({ user, input: { displayName: v.displayName, primaryEmail: v.primaryEmail, userDetails: user.userDetails } })
      .then(() => {
        toast.success(`Saved ${v.displayName}.`)
        setTimeout(onClose, 500)
      })
      .catch((error: Error) => toast.error(error.message))

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
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
      </FormField>
      <p className="-mt-2 text-xs text-text-muted">A new email needs verifying again.</p>
      <Buttons onClose={onClose} state={state} label="Save" />
    </form>
  )
}

export const EditUserProfileDialog = ({ user, onClose }: { user: AdminUser | null; onClose: () => void }) => (
  <Dialog open={!!user} onClose={onClose} title={user ? `Edit ${user.displayName}` : ''}>
    {user && <ProfileForm user={user} onClose={onClose} />}
  </Dialog>
)

/** Someone else's work, contact, availability and engineering details, saved through `PUT /user/admin/update/{id}`. */
export const EditUserDetailsDialog = ({ user, onClose }: { user: AdminUser | null; onClose: () => void }) => {
  const { mutateAsync: update } = useUpdateUserProfile()
  if (!user) return null
  return (
    <ProfileDetailsDialog
      open
      details={user.userDetails}
      title={`Edit ${user.displayName}'s profile details`}
      description="Work, contact, availability and engineering details. Everything is optional."
      onSave={(userDetails) =>
        update({ user, input: { displayName: user.displayName, primaryEmail: user.primaryEmail, userDetails } })
      }
      onClose={onClose}
    />
  )
}

// ── role and access policy ───────────────────────────────

const AccessForm = ({ user, onClose }: { user: AdminUser; onClose: () => void }) => {
  const { roles, canView: canViewRoles } = useRoleOptions()
  const canViewPolicies = useHasPermissions('policy:ar:view')
  const { data: policies = [] } = useAccessPolicies({ enabled: canViewPolicies })
  const { mutateAsync: update } = useUpdateUserAccess()
  const [state, save] = useAsyncAction(update, { successMs: 500 })
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserAccessFormValues>({
    resolver: yupResolver(userAccessSchema),
    defaultValues: { roleId: user.roleId, accessPolicyId: user.accessPolicyId ?? 0 },
  })

  const onSubmit = (v: UserAccessFormValues) => {
    const roleId = Number(v.roleId)
    const accessPolicyId = Number(v.accessPolicyId) || null
    if (roleId === user.roleId && accessPolicyId === user.accessPolicyId) {
      onClose()
      return
    }
    return save({ user, roleId, accessPolicyId })
      .then(() => {
        toast.success(`Updated ${user.displayName}'s access.`)
        setTimeout(onClose, 500)
      })
      .catch((error: Error) => toast.error(error.message))
  }

  // the current role and policy stay pickable even when the lists can't be loaded
  const roleKnown = roles.some((r) => r.roleId === user.roleId)
  const policyKnown = user.accessPolicyId === null || policies.some((p) => p.policyId === user.accessPolicyId)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <FormField id="accessRoleId" label="Role" error={errors.roleId?.message}>
        <Select id="accessRoleId" disabled={!canViewRoles} hasError={!!errors.roleId} {...register('roleId')}>
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
      <FormField id="accessPolicySelect" label="Access policy">
        <Select id="accessPolicySelect" disabled={!canViewPolicies} {...register('accessPolicyId')}>
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
      <p className="-mt-2 text-xs text-text-muted">
        Someone who's signed in gets the change when they next sign in or their session refreshes.
      </p>
      <Buttons onClose={onClose} state={state} label="Save" />
    </form>
  )
}

export const UserAccessDialog = ({ user, onClose }: { user: AdminUser | null; onClose: () => void }) => (
  <Dialog open={!!user} onClose={onClose} title={user ? `Change ${user.displayName}'s access` : ''}>
    {user && <AccessForm user={user} onClose={onClose} />}
  </Dialog>
)
