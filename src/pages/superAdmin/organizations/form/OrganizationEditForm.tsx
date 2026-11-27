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
 * The edit-organization form: name, plan limits, profile and billing on one page. The API has a
 * separate endpoint for each, so saving sends only the sections that changed, in that order.
 */

import { yupResolver } from '@hookform/resolvers/yup'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { FormCard, FormFooter } from '@/components/FormCard'
import { FormField } from '@/components/FormField'
import { Input } from '@/components/Input'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { useRenameOrganization, useUpdateOrganizationDetails, useUpdateOrganizationLimits } from '@/hooks/useOrganizations'
import type { Organization } from '@/types/organization'
import { formatBytes, formatNumber } from '@/utils/format'
import { parseOrgProfile, serializeOrgProfile } from '@/utils/orgProfile'
import { DetailRows, KeptNote, LimitInputs, OrgProfileFields } from './OrganizationFields'
import {
  editSchema,
  fromLimitsValues,
  joinDetails,
  limitsOf,
  NAME_MAX,
  splitDetails,
  toLimitsValues,
  type EditValues,
} from './organizationValidation'
import { useOrganizationNameFree } from './useOrganizationNameFree'

/** Each card's wrapper id ('name', 'limits', 'profile', 'billing') lets a link jump to it, e.g. `…/edit#limits`. */
export const OrganizationEditForm = ({
  org,
  onSaved,
  onCancel,
}: {
  org: Organization
  onSaved: () => void
  onCancel: () => void
}) => {
  const { mutateAsync: rename } = useRenameOrganization()
  const { mutateAsync: updateLimits } = useUpdateOrganizationLimits()
  const { mutateAsync: updateDetails } = useUpdateOrganizationDetails()
  const nameFree = useOrganizationNameFree()
  // what the form can't show as text is kept as saved; read once, like the form's defaults
  const [{ profile, billing }] = useState(() => ({
    profile: parseOrgProfile(org.organizationInfo),
    billing: splitDetails(org.billingInfo),
  }))
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<EditValues>({
    resolver: yupResolver(editSchema(org)),
    defaultValues: {
      organizationName: org.organizationName,
      limits: toLimitsValues(limitsOf(org)),
      profile: profile.values,
      extras: profile.extras,
      billing: billing.rows,
    },
  })
  const id = org.organizationId

  const [state, save] = useAsyncAction(
    async (v: EditValues) => {
      // the org prop is refetched after each save, so a retry after a half-done save skips the rename
      if (dirtyFields.organizationName && v.organizationName !== org.organizationName)
        await rename({ organizationId: id, name: v.organizationName })
      if (dirtyFields.limits) await updateLimits({ organizationId: id, limits: fromLimitsValues(v.limits) })
      if (dirtyFields.profile || dirtyFields.extras)
        await updateDetails({
          organizationId: id,
          which: 'profile',
          details: serializeOrgProfile(v.profile, v.extras, profile.kept),
        })
      if (dirtyFields.billing)
        await updateDetails({ organizationId: id, which: 'billing', details: joinDetails(v.billing, billing.kept) })
    },
    { successMs: 500 },
  )

  const onSubmit = async (v: EditValues) => {
    if (!isDirty) {
      toast.info('Nothing has changed.')
      return
    }
    if (dirtyFields.organizationName && v.organizationName !== org.organizationName && !(await nameFree(v.organizationName))) {
      setError('organizationName', { message: 'That name is already taken.' }, { shouldFocus: true })
      return
    }
    try {
      await save(v)
      toast.success(`Saved the changes to ${v.organizationName}.`)
      setTimeout(onSaved, 500)
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div id="name" className="scroll-mt-4">
          <FormCard title="Organization" hint="Enable or disable it from its own page.">
            <FormField id="orgName" required label="Name" error={errors.organizationName?.message}>
              <Input
                id="orgName"
                autoComplete="off"
                maxLength={NAME_MAX}
                hasError={!!errors.organizationName}
                {...register('organizationName')}
              />
            </FormField>
            <p className="font-mono text-xs text-text-muted">{org.organizationId}</p>
          </FormCard>
        </div>
        <div id="limits" className="scroll-mt-4">
          <FormCard title="Plan limits">
            <LimitInputs
              register={register}
              errors={errors.limits ?? {}}
              prefix="limits."
              hints={{
                aiCredit: `${formatNumber(org.aiCredit.used)} used`,
                storageGb: `${formatBytes(org.storageBytes.used)} used`,
                userLimit: "Can't go below the number of users it has",
                vaultProjectLimit: "Can't go below the projects it has",
              }}
            />
          </FormCard>
        </div>
        <div id="profile" className="scroll-mt-4 xl:col-span-2">
          <FormCard title="Profile" hint="Shown to the organization's own admins. Every field is optional.">
            <OrgProfileFields register={register} errors={errors.profile} prefix="profile." timezone={profile.values.timezone} />
            <fieldset className="flex flex-col gap-2 border-t border-border pt-4">
              <legend className="contents">
                <span className="text-xs font-medium tracking-wide text-text-muted uppercase">Other fields</span>
              </legend>
              <DetailRows
                control={control}
                register={register}
                errors={errors.extras}
                name="extras"
                placeholder="Anything else worth showing, as a label and value."
              />
            </fieldset>
            <KeptNote count={Object.keys(profile.kept).length} />
          </FormCard>
        </div>
        <div id="billing" className="scroll-mt-4 xl:col-span-2">
          <FormCard title="Billing" hint="Only super admins see these.">
            <DetailRows
              control={control}
              register={register}
              errors={errors.billing}
              name="billing"
              placeholder="No billing details yet."
            />
            <KeptNote count={Object.keys(billing.kept).length} />
          </FormCard>
        </div>
      </div>
      <FormFooter
        state={state}
        dirty={isDirty}
        editing
        submitLabel="Save changes"
        loadingText="Saving"
        successText="Saved"
        onCancel={onCancel}
      />
    </form>
  )
}
