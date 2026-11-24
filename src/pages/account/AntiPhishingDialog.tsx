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

/** Dialog for changing the signed-in user's anti-phishing secret (Account › Security). */

import { yupResolver } from '@hookform/resolvers/yup'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { Dialog } from '@/components/Dialog'
import { FormField } from '@/components/FormField'
import { Input } from '@/components/Input'
import { LoadingButton } from '@/components/LoadingButton'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { useUpdateAntiPhishingSecret } from '@/hooks/useAccount'
import { antiPhishingSchema, type AntiPhishingFormValues } from '@/pages/account/antiPhishingValidation'

/** Starts from the current secret (when it's loaded); saving replaces it for every future email. */
export const AntiPhishingDialog = ({ open, current, onClose }: { open: boolean; current: string; onClose: () => void }) => {
  const { mutateAsync } = useUpdateAntiPhishingSecret()
  const [state, save] = useAsyncAction(mutateAsync, { successMs: 400 })
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AntiPhishingFormValues>({ resolver: yupResolver(antiPhishingSchema), defaultValues: { secret: current } })

  useEffect(() => {
    if (open) reset({ secret: current })
  }, [open, current, reset])

  const onSubmit = ({ secret }: AntiPhishingFormValues) => {
    if (secret === current) return onClose()
    return save(secret)
      .then(() => {
        toast.success('Anti-phishing secret updated. Look for it in every email from N-Ops.')
        onClose()
      })
      .catch((error: Error) => toast.error(error.message))
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Change anti-phishing secret"
      description="Every email N-Ops sends you shows this secret. If an email claims to be from N-Ops but doesn't show it, don't trust it."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <FormField id="antiPhishingSecret" label="Secret" error={errors.secret?.message}>
          <Input
            id="antiPhishingSecret"
            autoComplete="off"
            spellCheck={false}
            maxLength={16}
            className="font-mono"
            hasError={!!errors.secret}
            {...register('secret')}
          />
          {!errors.secret && (
            <p className="text-xs text-text-muted">
              4–16 letters, digits, - or _. Pick something only you would recognize, not a password.
            </p>
          )}
        </FormField>
        <div className="flex justify-end gap-2">
          <LoadingButton variant="secondary" onClick={onClose}>
            Cancel
          </LoadingButton>
          <LoadingButton type="submit" state={state} loadingText="Saving" successText="Saved">
            Save secret
          </LoadingButton>
        </div>
      </form>
    </Dialog>
  )
}
