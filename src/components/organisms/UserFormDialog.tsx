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
 * Add-user dialog for Admin › Users (`POST /user/admin/create`). The API has no endpoint for editing
 * a user's details yet, so this only adds; renaming and password resets have their own dialogs.
 */

import { yupResolver } from '@hookform/resolvers/yup'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { Input } from '@/components/atoms/Input'
import { Select } from '@/components/atoms/Select'
import { Switch } from '@/components/atoms/Switch'
import { Dialog } from '@/components/molecules/Dialog'
import { FormField } from '@/components/molecules/FormField'
import { LoadingButton } from '@/components/molecules/LoadingButton'
import { ProfileDetailsFields } from '@/components/organisms/ProfileDetailsFields'
import { isUsernameAvailable } from '@/features/account/api/account'
import { isProfileDetailsEmpty, serializeProfileDetails } from '@/features/account/profileDetails'
import { emptyDetailsForm, fromDetailsForm } from '@/features/account/profileDetailsForm'
import { useAccessPolicies, useAdminUsers, useCreateUser, useRoleOptions } from '@/features/admin/hooks/useAdmin'
import { userSchema, type UserFormValues } from '@/features/admin/schema/adminSchemas'
import { useHasPermissions } from '@/features/auth/permissions'
import { useAsyncAction } from '@/hooks/useAsyncAction'

const UserForm = ({ onClose }: { onClose: () => void }) => {
  const { roles, canView: canViewRoles } = useRoleOptions()
  const canViewPolicies = useHasPermissions('policy:ar:view')
  const { data: policies = [] } = useAccessPolicies({ enabled: canViewPolicies })
  const { data: users = [] } = useAdminUsers()
  const { mutateAsync: create } = useCreateUser()
  const [state, save] = useAsyncAction(create, { successMs: 500 })

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: yupResolver(userSchema),
    defaultValues: {
      userName: '',
      displayName: '',
      primaryEmail: '',
      roleId: 0,
      password: '',
      confirmPassword: '',
      isActive: true,
      accessPolicyId: 0,
      details: emptyDetailsForm(),
    },
  })
  const [showDetails, setShowDetails] = useState(false)

  const onSubmit = async (v: UserFormValues) => {
    const details = fromDetailsForm(v.details)
    // the API reports a taken username or email only as a bare database error, so check first
    const email = v.primaryEmail.toLowerCase()
    if (users.some((u) => u.primaryEmail.toLowerCase() === email)) {
      setError('primaryEmail', { message: 'Someone in your organization already uses this email.' })
      return
    }
    try {
      if (!(await isUsernameAvailable(v.userName))) {
        setError('userName', { message: 'That username is taken.' })
        return
      }
    } catch {
      // the check is only a courtesy; the API still refuses a taken username
    }
    try {
      const { welcomeEmailSent } = await save({
        userName: v.userName,
        displayName: v.displayName,
        primaryEmail: v.primaryEmail,
        roleId: Number(v.roleId),
        password: v.password,
        isActive: v.isActive,
        accessPolicyId: Number(v.accessPolicyId) || null,
        userDetails: !isProfileDetailsEmpty(details) ? serializeProfileDetails(details) : {},
      })
      if (welcomeEmailSent) toast.success(`Added ${v.displayName}. They've been sent a welcome email.`)
      else toast.warning(`Added ${v.displayName}, but the welcome email couldn't be sent. Share their sign-in details yourself.`)
      setTimeout(onClose, 500)
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit, (invalid) => {
        // a problem in the collapsed section would be invisible, so open it
        if (invalid.details) setShowDetails(true)
      })}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField id="displayName" label="Name" error={errors.displayName?.message}>
          <Input
            id="displayName"
            placeholder="Priya Rao"
            autoComplete="off"
            hasError={!!errors.displayName}
            {...register('displayName')}
          />
        </FormField>
        <FormField id="userName" label="Username" error={errors.userName?.message}>
          <Input
            id="userName"
            placeholder="priya"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            hasError={!!errors.userName}
            {...register('userName')}
          />
        </FormField>
      </div>
      <FormField id="primaryEmail" label="Email" error={errors.primaryEmail?.message}>
        <Input
          id="primaryEmail"
          type="email"
          placeholder="priya@company.com"
          autoComplete="off"
          hasError={!!errors.primaryEmail}
          {...register('primaryEmail')}
        />
      </FormField>
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField id="password" label="Password" error={errors.password?.message}>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            hasError={!!errors.password}
            {...register('password')}
          />
        </FormField>
        <FormField id="confirmPassword" label="Confirm password" error={errors.confirmPassword?.message}>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            hasError={!!errors.confirmPassword}
            {...register('confirmPassword')}
          />
        </FormField>
      </div>
      <p className="-mt-2 text-xs text-text-muted">
        8–64 characters with an uppercase letter, a lowercase letter, a digit and a symbol. The welcome email doesn't include it,
        so share it with them yourself.
      </p>

      <FormField id="accessPolicyId" label="Access policy">
        <Select id="accessPolicyId" disabled={!canViewPolicies} {...register('accessPolicyId')}>
          <option value={0}>No access policy</option>
          {policies.map((p) => (
            <option key={p.policyId} value={p.policyId}>
              {p.policyName}
            </option>
          ))}
        </Select>
        <p className="text-xs text-text-muted">
          {canViewPolicies
            ? 'Sets the 2FA they must use and where they can sign in from.'
            : 'You need the “View access policies” permission (policy:ar:view) to pick a policy.'}
        </p>
      </FormField>

      <div className="rounded-lg border border-border p-4">
        <Switch label="Active" description="Inactive users can't sign in." {...register('isActive')} />
      </div>

      <section className="rounded-lg border border-border">
        <button
          type="button"
          aria-expanded={showDetails}
          aria-controls="newUserDetails"
          onClick={() => setShowDetails((s) => !s)}
          className="flex w-full items-center justify-between gap-3 p-4 text-left"
        >
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-text">Profile details</span>
            <span className="text-xs text-text-muted">
              Optional: job title, contact, working hours, GitHub and SSH keys. They can fill these in later too.
            </span>
          </span>
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={`shrink-0 text-text-muted transition-transform ${showDetails ? 'rotate-180' : ''}`}
          />
        </button>
        {/* kept mounted while collapsed, so typed values survive closing it */}
        <div
          id="newUserDetails"
          hidden={!showDetails}
          className={showDetails ? 'flex flex-col gap-5 border-t border-border p-4' : 'hidden'}
        >
          <ProfileDetailsFields register={register} control={control} errors={errors.details} prefix="details." />
        </div>
      </section>

      <div className="flex justify-end gap-2 pt-1">
        <LoadingButton variant="ghost" onClick={onClose}>
          Cancel
        </LoadingButton>
        <LoadingButton type="submit" state={state} loadingText="Adding" successText="Added">
          Add user
        </LoadingButton>
      </div>
    </form>
  )
}

/** Adds a user to the organization. */
export const UserFormDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => (
  <Dialog
    open={open}
    onClose={onClose}
    size="lg"
    title="Add user"
    description="They sign in with the username and password you set here, and get the role you pick."
  >
    <UserForm onClose={onClose} />
  </Dialog>
)
