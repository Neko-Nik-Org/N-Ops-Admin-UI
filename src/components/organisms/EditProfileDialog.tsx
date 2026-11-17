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
/** Dialog for the signed-in user to change their display name and email. */

import { yupResolver } from '@hookform/resolvers/yup'
import { useQueryClient } from '@tanstack/react-query'
import { useSetAtom } from 'jotai'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'react-toastify'
import { Input } from '@/components/atoms/Input'
import { Dialog } from '@/components/molecules/Dialog'
import { FormField } from '@/components/molecules/FormField'
import { LoadingButton } from '@/components/molecules/LoadingButton'
import { getProfile, updateProfile } from '@/features/account/api/account'
import { PROFILE_KEY } from '@/features/account/hooks/useAccount'
import { useSyncSelfSession } from '@/features/account/hooks/useSyncSelfSession'
import { editProfileSchema, type EditProfileFormValues } from '@/features/account/schema/accountSchemas'
import { currentUserAtom } from '@/features/auth/store/session'
import { isSessionRemembered } from '@/features/auth/store/sessionToken'
import type { CurrentUser } from '@/features/auth/types'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { errorStatus } from '@/types/api'

/** Props for EditProfileDialog. */
interface EditProfileDialogProps {
  open: boolean
  user: CurrentUser
  onClose: () => void
}

/** The API answers a unique-name/email clash with a bare 417 "SQL Database error". */
const friendlyError = (error: unknown): string =>
  errorStatus(error) === 417
    ? 'That name or email may already be in use by someone else. Try a different one.'
    : (error as Error).message

/**
 * Edits the display name and email through `PUT /user/self/profile`.
 *
 * The email is only sent when it changed, because the API marks any sent email unverified.
 * Email verification reads the address from the session, which the API only rebuilds on refresh,
 * so after an email change a session that can't be refreshed is signed out: verifying from the
 * stale session would send the code to the old address.
 */
export const EditProfileDialog = ({ open, user, onClose }: EditProfileDialogProps) => {
  const { sync, signOut } = useSyncSelfSession()
  const setCurrentUser = useSetAtom(currentUserAtom)
  const queryClient = useQueryClient()
  const defaults = { displayName: user.displayName, primaryEmail: user.primaryEmail }
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<EditProfileFormValues>({ resolver: yupResolver(editProfileSchema), defaultValues: defaults })

  // Start from the current profile each time the dialog opens.
  useEffect(() => {
    if (open) reset({ displayName: user.displayName, primaryEmail: user.primaryEmail })
  }, [open, user.displayName, user.primaryEmail, reset])

  const typedEmail = (useWatch({ control, name: 'primaryEmail' }) ?? '').trim()
  const emailChanging = typedEmail !== '' && typedEmail !== user.primaryEmail
  const remembered = isSessionRemembered()

  const [saveState, save] = useAsyncAction(updateProfile, { successMs: 500 })

  /** After a failure, reload the profile: the name may have saved even though the email didn't. */
  const reloadProfile = () =>
    getProfile()
      .then((fresh) => setCurrentUser((current) => (current ? { ...current, ...fresh } : current)))
      .catch(() => {})

  const onSubmit = async ({ displayName, primaryEmail }: EditProfileFormValues) => {
    const emailChanged = primaryEmail !== user.primaryEmail
    if (displayName === user.displayName && !emailChanged) {
      onClose()
      return
    }
    try {
      await save({ displayName, ...(emailChanged && { primaryEmail }) })
    } catch (error) {
      toast.error(friendlyError(error))
      void reloadProfile()
      return
    }

    const result = await sync({ displayName, ...(emailChanged && { primaryEmail, isEmailVerified: false }) })
    void queryClient.invalidateQueries({ queryKey: PROFILE_KEY })

    if (result === 'signed-out' || (emailChanged && result !== 'refreshed')) {
      toast.info(
        emailChanged ? `Profile saved. Sign in again to verify ${primaryEmail}.` : 'Profile saved. Sign in again to keep going.',
      )
      signOut()
      return
    }
    toast.success(emailChanged ? `Profile saved. Verify ${primaryEmail} to use it for sign-in codes.` : 'Profile saved.')
    setTimeout(onClose, 500)
  }

  return (
    <Dialog open={open} onClose={onClose} title="Edit profile" description="How you appear to others in your organization.">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <FormField id="profileDisplayName" label="Display name" error={errors.displayName?.message}>
          <Input
            id="profileDisplayName"
            autoComplete="name"
            maxLength={100}
            hasError={!!errors.displayName}
            {...register('displayName')}
          />
        </FormField>
        <FormField id="profilePrimaryEmail" label="Email" error={errors.primaryEmail?.message}>
          <Input
            id="profilePrimaryEmail"
            type="email"
            autoComplete="email"
            maxLength={254}
            hasError={!!errors.primaryEmail}
            {...register('primaryEmail')}
          />
        </FormField>
        {emailChanging && (
          <p className="-mt-1 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-text" role="note">
            Your new email will need verifying.
            {!remembered && ' You’ll be signed out after saving, so you can sign in again and verify it.'}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <LoadingButton variant="ghost" onClick={onClose}>
            Cancel
          </LoadingButton>
          <LoadingButton type="submit" state={saveState} loadingText="Saving" successText="Saved">
            Save changes
          </LoadingButton>
        </div>
      </form>
    </Dialog>
  )
}
