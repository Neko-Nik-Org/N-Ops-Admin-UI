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

/** Dialog for the signed-in user to change their own username. */

import { yupResolver } from '@hookform/resolvers/yup'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'react-toastify'
import { Input } from '@/components/Input'
import { LoadingButton } from '@/components/LoadingButton'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { Dialog } from '@/components/Dialog'
import { FormField } from '@/components/FormField'
import { changeUsername } from '@/api/account'
import { useUsernameAvailability, type UsernameAvailability } from '@/hooks/useAccount'
import { useSyncSelfSession } from '@/hooks/useSyncSelfSession'
import { changeUsernameSchema, type ChangeUsernameFormValues } from '@/utils/validation'
import { cn } from '@/utils/cn'

/** Props for ChangeUsernameDialog. */
interface ChangeUsernameDialogProps {
  open: boolean
  currentUserName: string
  onClose: () => void
}

/** Inline availability line under the field. */
const AVAILABILITY_TEXT: Record<Exclude<UsernameAvailability, 'idle'>, { text: string; className: string }> = {
  checking: { text: 'Checking availability…', className: 'text-text-muted' },
  available: { text: 'This username is available.', className: 'text-signal' },
  taken: { text: 'This username is already taken.', className: 'text-danger' },
  error: { text: "Couldn't check availability. You can still try to save.", className: 'text-warning' },
}

/**
 * Username field with live availability and the API's username rules. After a rename the session
 * is synced; when the API can't refresh it the user is asked to sign in again with the new name.
 */
export const ChangeUsernameDialog = ({ open, currentUserName, onClose }: ChangeUsernameDialogProps) => {
  const { sync, signOut } = useSyncSelfSession()
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ChangeUsernameFormValues>({
    resolver: yupResolver(changeUsernameSchema),
    context: { currentUserName },
    defaultValues: { userName: currentUserName },
  })

  const typed = useWatch({ control, name: 'userName' }) ?? ''
  const availability = useUsernameAvailability(typed, currentUserName)
  // Start from a clean form each time the dialog opens.
  useEffect(() => {
    if (open) reset({ userName: currentUserName })
  }, [open, currentUserName, reset])

  const [saveState, save] = useAsyncAction(changeUsername, { successMs: 500 })

  const onSubmit = ({ userName }: ChangeUsernameFormValues) =>
    save(userName)
      .then(() => sync({ userName }))
      .then((result) => {
        if (result === 'refreshed') {
          toast.success(`Username changed to ${userName}.`)
          setTimeout(onClose, 500)
        } else if (result === 'signed-out') {
          toast.info(`Username changed to ${userName}. Sign in again with your new username.`)
          signOut()
        } else {
          toast.success(`Username changed to ${userName}. Use it the next time you sign in.`)
          setTimeout(onClose, 500)
        }
      })
      .catch((error: Error) => toast.error(error.message))

  const status = availability === 'idle' || errors.userName ? null : AVAILABILITY_TEXT[availability]

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Change username"
      description="You sign in with your username. It must be unique."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField id="newUserName" required label="New username" error={errors.userName?.message}>
          <Input
            id="newUserName"
            autoComplete="username"
            spellCheck={false}
            className="font-mono"
            hasError={!!errors.userName || availability === 'taken'}
            aria-describedby="newUserName-status newUserName-hint"
            {...register('userName')}
          />
        </FormField>
        <p id="newUserName-status" className={cn('-mt-2 min-h-5 text-sm', status?.className)} aria-live="polite">
          {status?.text}
        </p>
        <p id="newUserName-hint" className="-mt-2 text-xs text-text-muted">
          3–100 characters: letters, digits and single underscores. Can't start with a digit or start/end with an underscore.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <LoadingButton variant="ghost" onClick={onClose}>
            Cancel
          </LoadingButton>
          <LoadingButton
            type="submit"
            state={saveState}
            loadingText="Saving"
            successText="Saved"
            disabled={availability === 'taken' || availability === 'checking'}
          >
            Change username
          </LoadingButton>
        </div>
      </form>
    </Dialog>
  )
}
