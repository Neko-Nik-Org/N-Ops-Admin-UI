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
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'react-toastify'
import { Input } from '@/components/atoms/Input'
import { Select } from '@/components/atoms/Select'
import { Switch } from '@/components/atoms/Switch'
import { Textarea } from '@/components/atoms/Textarea'
import { Dialog } from '@/components/molecules/Dialog'
import { FormField } from '@/components/molecules/FormField'
import { LoadingButton } from '@/components/molecules/LoadingButton'
import { isUsernameAvailable } from '@/features/account/api/account'
import { useAdminUsers, useCreateUser, useRoleOptions } from '@/features/admin/hooks/useAdmin'
import { splitList, userSchema, type UserFormValues } from '@/features/admin/schema/adminSchemas'
import { useAsyncAction } from '@/hooks/useAsyncAction'

const UserForm = ({ onClose }: { onClose: () => void }) => {
  const { roles, canView: canViewRoles } = useRoleOptions()
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
      hasIpRestriction: false,
      allowedIps: '',
      hasGeoRestriction: false,
      allowedGeoLocations: '',
    },
  })
  const hasIpRestriction = useWatch({ control, name: 'hasIpRestriction' })
  const hasGeoRestriction = useWatch({ control, name: 'hasGeoRestriction' })

  const onSubmit = async (v: UserFormValues) => {
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
        hasIpRestriction: v.hasIpRestriction,
        allowedIps: splitList(v.allowedIps),
        hasGeoRestriction: v.hasGeoRestriction,
        allowedGeoLocations: splitList(v.allowedGeoLocations).map((c) => c.toUpperCase()),
      })
      if (welcomeEmailSent) toast.success(`Added ${v.displayName}. They've been sent a welcome email.`)
      else toast.warning(`Added ${v.displayName}, but the welcome email couldn't be sent. Share their sign-in details yourself.`)
      setTimeout(onClose, 500)
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
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

      <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <Switch label="Active" description="Inactive users can't sign in." {...register('isActive')} />
        <Switch
          label="Restrict by IP address"
          description="Only allow sign-in from the addresses below."
          {...register('hasIpRestriction')}
        />
        {hasIpRestriction && (
          <FormField id="allowedIps" label="Allowed IP addresses" error={errors.allowedIps?.message}>
            <Textarea
              id="allowedIps"
              rows={3}
              placeholder={'203.0.113.0/24\n198.51.100.7'}
              className="font-mono"
              hasError={!!errors.allowedIps}
              {...register('allowedIps')}
            />
          </FormField>
        )}
        <Switch
          label="Restrict by country"
          description="Only allow sign-in from the countries below."
          {...register('hasGeoRestriction')}
        />
        {hasGeoRestriction && (
          <FormField id="allowedGeoLocations" label="Allowed countries" error={errors.allowedGeoLocations?.message}>
            <Input
              id="allowedGeoLocations"
              placeholder="IN, US"
              className="font-mono"
              hasError={!!errors.allowedGeoLocations}
              {...register('allowedGeoLocations')}
            />
          </FormField>
        )}
      </div>

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
