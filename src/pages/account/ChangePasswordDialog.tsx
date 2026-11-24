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

/** Dialog for the signed-in user to set a new password. */

import { yupResolver } from '@hookform/resolvers/yup'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { Input } from '@/components/Input'
import { LoadingButton } from '@/components/LoadingButton'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { Dialog } from '@/components/Dialog'
import { FormField } from '@/components/FormField'
import { changePassword } from '@/api/account'
import { changePasswordSchema, type ChangePasswordFormValues } from '@/utils/validation'

/** Props for ChangePasswordDialog. */
interface ChangePasswordDialogProps {
  open: boolean
  onClose: () => void
}

/** New password + confirmation, checked against the API's password policy before sending. */
export const ChangePasswordDialog = ({ open, onClose }: ChangePasswordDialogProps) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: yupResolver(changePasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  // Start from a clean form each time the dialog opens.
  useEffect(() => {
    if (open) reset({ newPassword: '', confirmPassword: '' })
  }, [open, reset])

  const [saveState, save] = useAsyncAction(changePassword, { successMs: 500 })

  const onSubmit = ({ newPassword }: ChangePasswordFormValues) =>
    save(newPassword)
      .then(() => {
        toast.success('Password changed. Use the new password the next time you sign in.')
        setTimeout(onClose, 500)
      })
      .catch((error: Error) => toast.error(error.message))

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Change password"
      description="Other signed-in sessions stay signed in until they expire."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField id="newPassword" label="New password" error={errors.newPassword?.message}>
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            hasError={!!errors.newPassword}
            {...register('newPassword')}
          />
        </FormField>
        <FormField id="confirmPassword" label="Confirm new password" error={errors.confirmPassword?.message}>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            hasError={!!errors.confirmPassword}
            {...register('confirmPassword')}
          />
        </FormField>
        <p className="text-xs text-text-muted">
          8–64 characters with at least one uppercase letter, one lowercase letter, one digit and one special character.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <LoadingButton variant="ghost" onClick={onClose}>
            Cancel
          </LoadingButton>
          <LoadingButton type="submit" state={saveState} loadingText="Saving" successText="Saved">
            Change password
          </LoadingButton>
        </div>
      </form>
    </Dialog>
  )
}
