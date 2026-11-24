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
 * Editor for profile details, in the structure from features/account/profileDetails.ts: the signed-in
 * user's own (`/user/self/details`), or another user's when an admin passes `onSave`. Values it
 * doesn't know are saved back unchanged.
 */

import { yupResolver } from '@hookform/resolvers/yup'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { Dialog } from '@/components/molecules/Dialog'
import { LoadingButton } from '@/components/molecules/LoadingButton'
import { ProfileDetailsFields } from '@/components/organisms/ProfileDetailsFields'
import { useSaveUserDetails } from '@/features/account/hooks/useAccount'
import { browserTimeZone, parseProfileDetails, serializeProfileDetails } from '@/features/account/profileDetails'
import { fromDetailsForm, toDetailsForm } from '@/features/account/profileDetailsForm'
import { profileDetailsSchema, type ProfileDetailsFormValues } from '@/features/account/schema/accountSchemas'
import type { JsonObject } from '@/features/account/types'
import { useAsyncAction } from '@/hooks/useAsyncAction'

export const ProfileDetailsDialog = ({
  open,
  details,
  onClose,
  onSave,
  title = 'Edit profile details',
  description = "Visible to your organization's admins. Fill in what's useful; everything is optional.",
}: {
  open: boolean
  details: JsonObject
  onClose: () => void
  /** Saves the whole details object; defaults to saving the signed-in user's own. */
  onSave?: (details: JsonObject) => Promise<unknown>
  title?: string
  description?: string
}) => {
  const { details: saved, preserved } = useMemo(() => parseProfileDetails(details), [details])
  const { mutateAsync } = useSaveUserDetails()
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileDetailsFormValues>({ resolver: yupResolver(profileDetailsSchema), defaultValues: toDetailsForm(saved) })

  // start from what's saved each time it opens; suggest the browser's time zone if none is set
  useEffect(() => {
    if (!open) return
    const start = toDetailsForm(saved)
    if (!start.availability.timezone) start.availability.timezone = browserTimeZone()
    reset(start)
  }, [open, saved, reset])

  const [saveState, save] = useAsyncAction(
    (values: ProfileDetailsFormValues) => (onSave ?? mutateAsync)(serializeProfileDetails(fromDetailsForm(values), preserved)),
    { successMs: 500 },
  )
  const onSubmit = (values: ProfileDetailsFormValues) =>
    save(values)
      .then(() => {
        toast.success('Profile details saved.')
        setTimeout(onClose, 500)
      })
      .catch((error: Error) => toast.error(error.message))

  const preservedCount = Object.keys(preserved).length

  return (
    <Dialog open={open} onClose={onClose} size="lg" title={title} description={description}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        <ProfileDetailsFields
          register={register}
          control={control}
          errors={errors}
          timezone={saved.availability.timezone}
          preservedCount={preservedCount}
        />

        <div className="flex justify-end gap-2 pt-1">
          <LoadingButton variant="ghost" onClick={onClose}>
            Cancel
          </LoadingButton>
          <LoadingButton type="submit" state={saveState} loadingText="Saving" successText="Saved">
            Save details
          </LoadingButton>
        </div>
      </form>
    </Dialog>
  )
}
