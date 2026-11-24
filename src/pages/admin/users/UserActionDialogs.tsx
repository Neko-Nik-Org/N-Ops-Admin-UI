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
/** Dialogs an admin uses on another user's page: change their username, set a new password. */

import { yupResolver } from '@hookform/resolvers/yup'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { Input } from '@/components/Input'
import { Dialog } from '@/components/Dialog'
import { FormField } from '@/components/FormField'
import { LoadingButton } from '@/components/LoadingButton'
import { isUsernameAvailable } from '@/api/account'
import { useChangeUserName, useResetUserPassword } from '@/hooks/useUsers'
import {
  renameUserSchema,
  resetPasswordSchema,
  type RenameUserFormValues,
  type ResetPasswordFormValues,
} from '@/pages/admin/users/form/userValidation'
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
