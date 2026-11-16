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

/** Dialog for editing the signed-in user's free-form profile details. */

import { yupResolver } from '@hookform/resolvers/yup'
import { Plus, Trash2 } from 'lucide-react'
import { useEffect } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { Input } from '@/components/atoms/Input'
import { LoadingButton } from '@/components/molecules/LoadingButton'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { Dialog } from '@/components/molecules/Dialog'
import { mergeDetails, splitDetails } from '@/features/account/details'
import { useSaveUserDetails } from '@/features/account/hooks/useAccount'
import { DETAIL_FIELDS_MAX, profileDetailsSchema, type ProfileDetailsFormValues } from '@/features/account/schema/accountSchemas'
import type { JsonObject } from '@/features/account/types'

/** Props for ProfileDetailsDialog. */
interface ProfileDetailsDialogProps {
  open: boolean
  /** The details as currently saved. */
  details: JsonObject
  onClose: () => void
}

/** Suggestions offered when the list is empty, so a first-time user isn't faced with a blank form. */
const STARTER_FIELDS = [
  { label: 'Job title', value: '' },
  { label: 'Team', value: '' },
]

/** Label/value rows; add, edit and remove text fields. Non-text values are saved back unchanged. */
export const ProfileDetailsDialog = ({ open, details, onClose }: ProfileDetailsDialogProps) => {
  const { fields: initial, preserved } = splitDetails(details)
  const { mutateAsync } = useSaveUserDetails()

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileDetailsFormValues>({
    resolver: yupResolver(profileDetailsSchema),
    defaultValues: { fields: initial },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'fields' })

  // Load the saved details each time the dialog opens.
  useEffect(() => {
    if (!open) return
    const { fields: saved } = splitDetails(details)
    reset({ fields: saved.length ? saved : STARTER_FIELDS })
  }, [open, details, reset])

  const [saveState, save] = useAsyncAction(
    (values: ProfileDetailsFormValues) => mutateAsync(mergeDetails(values.fields, preserved)),
    {
      successMs: 500,
    },
  )

  const onSubmit = (values: ProfileDetailsFormValues) =>
    save({ fields: values.fields.filter((f) => f.label.trim()) })
      .then(() => {
        toast.success('Profile details saved.')
        setTimeout(onClose, 500)
      })
      .catch((error: Error) => toast.error(error.message))

  const preservedCount = Object.keys(preserved).length

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Edit profile details"
      description="Extra information about you, visible to your organization's admins."
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {fields.length === 0 ? (
          <p className="text-sm text-text-muted">No details. Add a field to get started.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {fields.map((field, index) => {
              const fieldErrors = errors.fields?.[index]
              return (
                <li key={field.id} className="flex flex-col gap-1">
                  <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] items-start gap-2">
                    <Input
                      aria-label={`Label ${index + 1}`}
                      placeholder="Label"
                      autoComplete="off"
                      hasError={!!fieldErrors?.label}
                      {...register(`fields.${index}.label`)}
                    />
                    <Input
                      aria-label={`Value ${index + 1}`}
                      placeholder="Value"
                      autoComplete="off"
                      hasError={!!fieldErrors?.value}
                      {...register(`fields.${index}.value`)}
                    />
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      aria-label={`Remove field ${index + 1}`}
                      className="mt-2 rounded p-1 text-text-muted hover:text-danger"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {(fieldErrors?.label || fieldErrors?.value) && (
                    <p className="text-sm text-danger" role="alert">
                      {fieldErrors.label?.message ?? fieldErrors.value?.message}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {errors.fields?.root?.message && (
          <p className="text-sm text-danger" role="alert">
            {errors.fields.root.message}
          </p>
        )}

        <div>
          <LoadingButton
            variant="ghost"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => append({ label: '', value: '' })}
            disabled={fields.length >= DETAIL_FIELDS_MAX}
          >
            Add field
          </LoadingButton>
        </div>

        {preservedCount > 0 && (
          <p className="text-xs text-text-muted">
            {preservedCount === 1 ? '1 non-text value is' : `${preservedCount} non-text values are`} kept as they are.
          </p>
        )}

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
