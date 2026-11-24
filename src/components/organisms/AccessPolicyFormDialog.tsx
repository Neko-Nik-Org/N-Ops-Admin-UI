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
/** Create / edit dialog for Admin › Access policies: required 2FA methods and IP / country sign-in limits. */

import { yupResolver } from '@hookform/resolvers/yup'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'react-toastify'
import { Input } from '@/components/atoms/Input'
import { Switch } from '@/components/atoms/Switch'
import { Textarea } from '@/components/atoms/Textarea'
import { Dialog } from '@/components/molecules/Dialog'
import { FormField } from '@/components/molecules/FormField'
import { MultiSelect } from '@/components/molecules/MultiSelect'
import { COUNTRY_OPTIONS } from '@/constants/countries'
import { LoadingButton } from '@/components/molecules/LoadingButton'
import { Skeleton } from '@/components/molecules/Skeleton'
import { useAccessPolicies, useAccessPolicy, useCreateAccessPolicy, useUpdateAccessPolicy } from '@/features/admin/hooks/useAdmin'
import { accessPolicySchema, splitList, type AccessPolicyFormValues } from '@/features/admin/schema/adminSchemas'
import type { AccessPolicy, AccessPolicyInput } from '@/features/admin/types'
import { useAsyncAction } from '@/hooks/useAsyncAction'

/** The form; mounted only while the dialog is open. */
const AccessPolicyForm = ({
  policy,
  template,
  onClose,
}: {
  policy?: AccessPolicy
  template?: AccessPolicy
  onClose: () => void
}) => {
  const start = policy ?? template
  // already cached by the page; catches duplicate names, which the API only reports as a database error
  const { data: existing = [] } = useAccessPolicies()
  const { mutateAsync: create } = useCreateAccessPolicy()
  const { mutateAsync: update } = useUpdateAccessPolicy()
  const [state, save] = useAsyncAction(
    async (input: AccessPolicyInput): Promise<void> => {
      if (policy) await update({ policy, input })
      else await create(input)
    },
    { successMs: 500 },
  )

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<AccessPolicyFormValues>({
    resolver: yupResolver(accessPolicySchema),
    defaultValues: {
      policyName: start?.policyName ?? '',
      policyDescription: start?.policyDescription ?? '',
      enforceTotp2fa: start?.enforceTotp2fa ?? false,
      enforceEmail2fa: start?.enforceEmail2fa ?? false,
      hasIpRestriction: start?.hasIpRestriction ?? false,
      allowedIps: start?.allowedIps.join('\n') ?? '',
      hasGeoRestriction: start?.hasGeoRestriction ?? false,
      allowedGeoLocations: start?.allowedGeoLocations.map((c) => c.toUpperCase()) ?? [],
    },
  })
  const hasIpRestriction = useWatch({ control, name: 'hasIpRestriction' })
  const hasGeoRestriction = useWatch({ control, name: 'hasGeoRestriction' })

  const onSubmit = (v: AccessPolicyFormValues) => {
    // names are unique per organization (case-sensitive, like the database constraint)
    if (existing.some((p) => p.policyId !== policy?.policyId && p.policyName === v.policyName)) {
      setError('policyName', { message: `A policy called "${v.policyName}" already exists.` })
      return
    }
    return save({
      policyName: v.policyName,
      policyDescription: v.policyDescription,
      enforceTotp2fa: v.enforceTotp2fa,
      enforceEmail2fa: v.enforceEmail2fa,
      hasIpRestriction: v.hasIpRestriction,
      allowedIps: splitList(v.allowedIps),
      hasGeoRestriction: v.hasGeoRestriction,
      allowedGeoLocations: v.allowedGeoLocations,
    })
      .then(() => {
        toast.success(policy ? `Saved ${v.policyName}.` : `Created ${v.policyName}.`)
        setTimeout(onClose, 500)
      })
      .catch((error: Error) => toast.error(error.message))
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-col gap-5" noValidate>
      <FormField id="policyName" label="Name" error={errors.policyName?.message}>
        <Input
          id="policyName"
          placeholder="Office only"
          autoComplete="off"
          maxLength={100}
          hasError={!!errors.policyName}
          {...register('policyName')}
        />
      </FormField>
      <FormField id="policyDescription" label="Description" error={errors.policyDescription?.message}>
        <Input
          id="policyDescription"
          placeholder="Who this policy is for"
          autoComplete="off"
          hasError={!!errors.policyDescription}
          {...register('policyDescription')}
        />
      </FormField>

      <fieldset className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <legend className="px-1 text-sm text-text-muted">Two-factor sign-in</legend>
        <Switch
          label="Require an authenticator app"
          description="Users with this policy must use a TOTP code from an authenticator app."
          {...register('enforceTotp2fa')}
        />
        <Switch
          label="Require email codes"
          description="Users with this policy must enter a code sent to their email."
          {...register('enforceEmail2fa')}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <legend className="px-1 text-sm text-text-muted">Where they can sign in from</legend>
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
            <Controller
              control={control}
              name="allowedGeoLocations"
              render={({ field }) => (
                <MultiSelect
                  id="allowedGeoLocations"
                  options={COUNTRY_OPTIONS}
                  value={field.value ?? []}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="Search countries"
                  emptyText="No country matches"
                  chipLabel={(o) => `${o.label} (${o.value})`}
                  hasError={!!errors.allowedGeoLocations}
                />
              )}
            />
          </FormField>
        )}
        {hasIpRestriction && hasGeoRestriction && (
          <p className="text-xs text-text-muted">With both on, a sign-in must pass both checks.</p>
        )}
      </fieldset>

      <div className="flex justify-end gap-2">
        <LoadingButton variant="ghost" onClick={onClose}>
          Cancel
        </LoadingButton>
        <LoadingButton
          type="submit"
          state={state}
          loadingText={policy ? 'Saving' : 'Creating'}
          successText={policy ? 'Saved' : 'Created'}
        >
          {policy ? 'Save changes' : 'Create policy'}
        </LoadingButton>
      </div>
    </form>
  )
}

/** Edits `policy` from its latest saved state, so the save only sends what changed; falls back to the list's copy. */
const EditAccessPolicyForm = ({ policy, onClose }: { policy: AccessPolicy; onClose: () => void }) => {
  const { data: latest, isPending } = useAccessPolicy(policy.policyId)
  if (isPending)
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading policy">
        <Skeleton height={40} />
        <Skeleton height={160} />
      </div>
    )
  return <AccessPolicyForm policy={latest ?? policy} onClose={onClose} />
}

/** Creates a policy (optionally from `template`), or edits `policy` when given. */
export const AccessPolicyFormDialog = ({
  open,
  policy,
  template,
  onClose,
}: {
  open: boolean
  /** The policy being edited; omit to create one. */
  policy?: AccessPolicy
  /** Pre-fills a new policy (Duplicate). */
  template?: AccessPolicy
  onClose: () => void
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    size="lg"
    title={policy ? `Edit ${policy.policyName}` : 'New access policy'}
    description="Sign-in rules for the users who are given this policy."
  >
    {open && policy ? (
      <EditAccessPolicyForm policy={policy} onClose={onClose} />
    ) : (
      <AccessPolicyForm template={template} onClose={onClose} />
    )}
  </Dialog>
)
