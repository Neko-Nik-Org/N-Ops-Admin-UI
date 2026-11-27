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
/** The new-organization form: name and status, plan limits, profile and billing, sent as one request. */

import { yupResolver } from '@hookform/resolvers/yup'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { FormCard, FormFooter } from '@/components/FormCard'
import { FormField } from '@/components/FormField'
import { Input } from '@/components/Input'
import { Switch } from '@/components/Switch'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { useCreateOrganization } from '@/hooks/useOrganizations'
import { emptyOrgProfile, serializeOrgProfile } from '@/utils/orgProfile'
import { DetailRows, LimitInputs, OrgProfileFields } from './OrganizationFields'
import {
  createSchema,
  DEFAULT_LIMITS,
  fromLimitsValues,
  joinDetails,
  NAME_MAX,
  toLimitsValues,
  type CreateValues,
} from './organizationValidation'
import { useOrganizationNameFree } from './useOrganizationNameFree'

export const OrganizationCreateForm = ({
  onCreated,
  onCancel,
}: {
  /** Called with the new organization's name (the API doesn't return its id). */
  onCreated: (name: string) => void
  onCancel: () => void
}) => {
  const { mutateAsync: create } = useCreateOrganization()
  const [state, save] = useAsyncAction(create, { successMs: 500 })
  const nameFree = useOrganizationNameFree()
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<CreateValues>({
    resolver: yupResolver(createSchema),
    defaultValues: {
      organizationName: '',
      isActive: true,
      limits: toLimitsValues(DEFAULT_LIMITS),
      profile: emptyOrgProfile(),
      billing: [],
    },
  })

  const onSubmit = async (v: CreateValues) => {
    if (!(await nameFree(v.organizationName))) {
      setError('organizationName', { message: 'That name is already taken.' }, { shouldFocus: true })
      return
    }
    try {
      await save({
        organizationName: v.organizationName,
        isActive: v.isActive,
        organizationInfo: serializeOrgProfile(v.profile),
        billingInfo: joinDetails(v.billing, {}),
        ...fromLimitsValues(v.limits),
      })
      toast.success(`Created ${v.organizationName}.`)
      setTimeout(() => onCreated(v.organizationName), 500)
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <FormCard title="Organization" hint="The API also creates its encryption key.">
          <FormField id="orgName" required label="Name" error={errors.organizationName?.message}>
            <Input
              id="orgName"
              autoComplete="off"
              autoFocus
              maxLength={NAME_MAX}
              hasError={!!errors.organizationName}
              {...register('organizationName')}
            />
          </FormField>
          <Switch label="Active" description="People in a disabled organization can't sign in." {...register('isActive')} />
        </FormCard>
        <FormCard title="Plan limits">
          <LimitInputs register={register} errors={errors.limits ?? {}} prefix="limits." />
        </FormCard>
        <div className="xl:col-span-2">
          <FormCard title="Profile" hint="Optional. Shown to the organization's own admins.">
            <OrgProfileFields register={register} errors={errors.profile} prefix="profile." />
          </FormCard>
        </div>
        <div className="xl:col-span-2">
          <FormCard title="Billing" hint="Only super admins see these.">
            <DetailRows
              control={control}
              register={register}
              errors={errors.billing}
              name="billing"
              placeholder="GST number, plan, SLA… as a label and value."
            />
          </FormCard>
        </div>
      </div>
      <FormFooter
        state={state}
        dirty={isDirty}
        editing={false}
        idleNote="Every limit starts on the default plan."
        submitLabel="Create organization"
        loadingText="Creating"
        successText="Created"
        onCancel={onCancel}
      />
    </form>
  )
}
