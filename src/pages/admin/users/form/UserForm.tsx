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
/** Add-user form for Admin › Users (`POST /user/admin/create`). Editing someone is UserEditForm. */

import { yupResolver } from '@hookform/resolvers/yup'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { Input } from '@/components/Input'
import { Select } from '@/components/Select'
import { Switch } from '@/components/Switch'
import { FormCard, FormFooter } from '@/components/FormCard'
import { FormField } from '@/components/FormField'
import { ProfileDetailsFields } from '@/components/ProfileDetailsFields'
import { isUsernameAvailable } from '@/api/account'
import { isProfileDetailsEmpty, serializeProfileDetails } from '@/utils/profileDetails'
import { emptyDetailsForm, fromDetailsForm } from '@/utils/profileDetailsForm'
import { useAccessPolicies } from '@/hooks/useAccessPolicies'
import { useAdminUsers, useCreateUser } from '@/hooks/useUsers'
import { useRoleOptions } from '@/hooks/useRoles'
import { userSchema, type UserFormValues } from '@/pages/admin/users/form/userValidation'
import { useHasPermissions } from '@/hooks/usePermissions'
import { useAsyncAction } from '@/hooks/useAsyncAction'

/** Adds a user to the organization. They sign in with the username and password set here. */
export const UserForm = ({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) => {
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
    formState: { errors, isDirty },
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
      setTimeout(onSaved, 500)
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <FormCard title="Account" hint="They sign in with the username and password you set here.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField id="displayName" required label="Name" error={errors.displayName?.message}>
                <Input
                  id="displayName"
                  placeholder="Priya Rao"
                  autoComplete="off"
                  hasError={!!errors.displayName}
                  {...register('displayName')}
                />
              </FormField>
              <FormField id="userName" required label="Username" error={errors.userName?.message}>
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
            <FormField id="primaryEmail" required label="Email" error={errors.primaryEmail?.message}>
              <Input
                id="primaryEmail"
                type="email"
                placeholder="priya@company.com"
                autoComplete="off"
                hasError={!!errors.primaryEmail}
                {...register('primaryEmail')}
              />
            </FormField>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField id="password" required label="Password" error={errors.password?.message}>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  hasError={!!errors.password}
                  {...register('password')}
                />
              </FormField>
              <FormField id="confirmPassword" required label="Confirm password" error={errors.confirmPassword?.message}>
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
              8–64 characters with an uppercase letter, a lowercase letter, a digit and a symbol. The welcome email doesn't
              include it, so share it with them yourself.
            </p>
            <Switch label="Active" description="Inactive users can't sign in." {...register('isActive')} />
          </FormCard>

          <FormCard title="Access">
            <FormField id="roleId" required label="Role" error={errors.roleId?.message}>
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
          </FormCard>
        </div>

        <FormCard
          title="Profile details"
          hint="Optional: job title, contact, working hours, GitHub and SSH keys. They can fill these in later too."
        >
          <ProfileDetailsFields register={register} control={control} errors={errors.details} prefix="details." />
        </FormCard>
      </div>

      <FormFooter
        state={state}
        dirty={isDirty}
        editing={false}
        idleNote="Name, username, email, role and password are required."
        submitLabel="Add user"
        loadingText="Adding"
        successText="Added"
        onCancel={onCancel}
      />
    </form>
  )
}
