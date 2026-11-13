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

/** Create / edit tag dialog. */

import { yupResolver } from '@hookform/resolvers/yup'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { Input } from '@/components/atoms/Input'
import { LoadingButton, useAsyncAction } from '@/components/loading'
import { Dialog } from '@/components/molecules/Dialog'
import { FormField } from '@/components/molecules/FormField'
import { useCreateTag, useTag, useUpdateTag } from '@/features/tags/hooks/useTags'
import { tagSchema, type TagFormValues } from '@/features/tags/schema/tagSchema'
import type { Tag } from '@/features/tags/types'

/** Props for TagFormDialog. */
interface TagFormDialogProps {
  open: boolean
  /** The tag being edited; omit to create a new one. */
  tag?: Tag
  onClose: () => void
}

/** Tag name and description form in a dialog. Creates a tag, or edits `tag` when given. */
export const TagFormDialog = ({ open, tag, onClose }: TagFormDialogProps) => {
  const isEdit = !!tag
  const { data: latest } = useTag(open && tag ? tag.tagId : null, tag)
  const { mutateAsync: create } = useCreateTag()
  const { mutateAsync: update } = useUpdateTag()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<TagFormValues>({
    resolver: yupResolver(tagSchema),
    defaultValues: { tagName: '', tagDescription: '' },
  })

  // Load the tag into the form when the dialog opens, and again if a fresher copy arrives before the user edits.
  useEffect(() => {
    if (!open) return
    if (!isDirty) reset({ tagName: latest?.tagName ?? '', tagDescription: latest?.tagDescription ?? '' })
  }, [open, latest, isDirty, reset])

  const [saveState, save] = useAsyncAction(
    (values: TagFormValues) =>
      tag ? update({ tagId: tag.tagId, input: values }) : create(values),
    { successMs: 500 },
  )

  /** Saves the tag, shows a toast and closes the dialog. */
  const onSubmit = (values: TagFormValues) =>
    save(values)
      .then(() => {
        toast.success(isEdit ? 'Tag updated.' : 'Tag created.')
        setTimeout(() => {
          reset({ tagName: '', tagDescription: '' })
          onClose()
        }, 500)
      })
      .catch((error: Error) => toast.error(error.message))

  /** Closes the dialog and clears the form. */
  const handleClose = () => {
    reset({ tagName: '', tagDescription: '' })
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit tag' : 'New tag'}
      description="Tags group servers, secrets and API keys, and scope what each role can reach."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField id="tagName" label="Name" error={errors.tagName?.message}>
          <Input id="tagName" placeholder="production" autoComplete="off" hasError={!!errors.tagName} {...register('tagName')} />
        </FormField>

        <FormField id="tagDescription" label="Description" error={errors.tagDescription?.message}>
          <textarea
            id="tagDescription"
            rows={3}
            placeholder="Customer-facing production servers"
            className="w-full resize-y rounded-md border border-border bg-surface-raised px-3 py-2.5 text-sm text-text placeholder:text-text-muted focus-visible:border-signal"
            {...register('tagDescription')}
          />
        </FormField>

        <div className="flex justify-end gap-2 pt-1">
          <LoadingButton variant="ghost" onClick={handleClose}>
            Cancel
          </LoadingButton>
          <LoadingButton
            type="submit"
            state={saveState}
            loadingText={isEdit ? 'Saving' : 'Creating'}
            successText={isEdit ? 'Saved' : 'Created'}
          >
            {isEdit ? 'Save changes' : 'Create tag'}
          </LoadingButton>
        </div>
      </form>
    </Dialog>
  )
}
