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
/** Create / edit user dialog for Admin › Users. */

import { yupResolver } from '@hookform/resolvers/yup'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'react-toastify'
import { Input } from '@/components/atoms/Input'
import { Select } from '@/components/atoms/Select'
import { Switch } from '@/components/atoms/Switch'
import { Textarea } from '@/components/atoms/Textarea'
import { LoadingButton, useAsyncAction } from '@/components/loading'
import { Dialog } from '@/components/molecules/Dialog'
import { FormField } from '@/components/molecules/FormField'
import { useCreateUser, useRoles, useUpdateUser } from '@/features/admin/hooks/useAdmin'
import { splitList, userSchema, type UserFormValues } from '@/features/admin/schema/adminSchemas'
import type { AdminUser, AdminUserInput } from '@/features/admin/types'

/** The form itself; mounted only while the dialog is open, so it always starts from `user`. */
const UserForm = ({ user, onClose }: { user?: AdminUser; onClose: () => void }) => {
  const { data: roles } = useRoles()
  const { mutateAsync: create } = useCreateUser()
  const { mutateAsync: update } = useUpdateUser()
  const [state, save] = useAsyncAction(
    async (input: AdminUserInput): Promise<void> => {
      if (user) await update({ userId: user.userId, input })
      else await create(input)
    },
    { successMs: 500 },
  )

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: yupResolver(userSchema),
    defaultValues: {
      userName: user?.userName ?? '',
      displayName: user?.displayName ?? '',
      primaryEmail: user?.primaryEmail ?? '',
      roleId: user?.roleId ?? 0,
      isActive: user?.isActive ?? true,
      hasIpRestriction: user?.hasIpRestriction ?? false,
      allowedIps: user?.allowedIps.join('\n') ?? '',
    },
  })
  const hasIpRestriction = useWatch({ control, name: 'hasIpRestriction' })

  const onSubmit = (v: UserFormValues) =>
    save({ ...v, roleId: Number(v.roleId), allowedIps: splitList(v.allowedIps) })
      .then(() => {
        toast.success(user ? `Saved ${v.displayName}.` : `Added ${v.displayName}. They'll get an email to set a password.`)
        setTimeout(onClose, 500)
      })
      .catch((error: Error) => toast.error(error.message))

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField id="displayName" label="Name" error={errors.displayName?.message}>
          <Input id="displayName" placeholder="Priya Rao" autoComplete="off" hasError={!!errors.displayName} {...register('displayName')} />
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
        <Input id="primaryEmail" type="email" placeholder="priya@company.com" hasError={!!errors.primaryEmail} {...register('primaryEmail')} />
      </FormField>
      <FormField id="roleId" label="Role" error={errors.roleId?.message}>
        <Select id="roleId" hasError={!!errors.roleId} {...register('roleId')}>
          <option value={0} disabled>
            Pick a role
          </option>
          {roles?.map((r) => (
            <option key={r.roleId} value={r.roleId}>
              {r.roleName}
            </option>
          ))}
        </Select>
      </FormField>

      <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <Switch label="Active" description="Inactive users can't sign in. Their history is kept." {...register('isActive')} />
        <Switch label="Restrict by IP address" description="Only allow sign-in from the addresses below." {...register('hasIpRestriction')} />
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
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <LoadingButton variant="ghost" onClick={onClose}>
          Cancel
        </LoadingButton>
        <LoadingButton type="submit" state={state} loadingText={user ? 'Saving' : 'Adding'} successText={user ? 'Saved' : 'Added'}>
          {user ? 'Save changes' : 'Add user'}
        </LoadingButton>
      </div>
    </form>
  )
}

/** Props for UserFormDialog. */
interface UserFormDialogProps {
  open: boolean
  /** The user being edited; omit to add a new one. */
  user?: AdminUser
  onClose: () => void
}

/** Adds a user, or edits `user` when given. */
export const UserFormDialog = ({ open, user, onClose }: UserFormDialogProps) => (
  <Dialog
    open={open}
    onClose={onClose}
    title={user ? `Edit ${user.displayName}` : 'Add user'}
    description={user ? undefined : 'They get an email to set their password, and sign in with the role you pick.'}
  >
    <UserForm user={user} onClose={onClose} />
  </Dialog>
)
