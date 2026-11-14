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
/** Admin › Organization (/admin/organization): view and edit the organization's profile; quotas are read-only. */

import { yupResolver } from '@hookform/resolvers/yup'
import { Pencil } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { Badge } from '@/components/atoms/Badge'
import { Input } from '@/components/atoms/Input'
import { Select } from '@/components/atoms/Select'
import { Textarea } from '@/components/atoms/Textarea'
import { LoadingButton, SkeletonText, useAsyncAction } from '@/components/loading'
import { FormField } from '@/components/molecules/FormField'
import { Meter } from '@/components/molecules/Meter'
import { PageHeader } from '@/components/molecules/PageHeader'
import { useOrganization, useUpdateOrganization } from '@/features/admin/hooks/useAdmin'
import { organizationSchema, type OrganizationFormValues } from '@/features/admin/schema/adminSchemas'
import type { Organization } from '@/features/admin/types'
import { formatBytes, formatDate, formatNumber } from '@/utils/format'

/** Time zones the browser knows, with a short fallback list for older browsers. */
const TIME_ZONES: readonly string[] = (() => {
  try {
    return Intl.supportedValuesOf('timeZone')
  } catch {
    return ['UTC', 'Asia/Kolkata', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles', 'Asia/Singapore', 'Australia/Sydney']
  }
})()

/** One label / value pair in the profile. */
const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-col gap-0.5">
    <dt className="text-sm text-text-muted">{label}</dt>
    <dd className="text-sm break-words text-text">{children}</dd>
  </div>
)

/** The organization's profile, read-only, with an Edit button. */
const ProfileView = ({ org, onEdit }: { org: Organization; onEdit: () => void }) => (
  <>
    <div className="mb-4 flex items-center justify-between gap-2">
      <h2 className="font-semibold text-text">Profile</h2>
      <LoadingButton variant="secondary" size="sm" icon={<Pencil size={14} />} onClick={onEdit}>
        Edit
      </LoadingButton>
    </div>
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Name">
        <span className="font-medium">{org.organizationName}</span>
      </Field>
      <Field label="Status">
        <Badge tone={org.isActive ? 'signal' : 'danger'}>{org.isActive ? 'Active' : 'Suspended'}</Badge>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Description">{org.info.description || '—'}</Field>
      </div>
      <Field label="Website">
        {org.info.website ? (
          <a href={org.info.website} target="_blank" rel="noreferrer" className="text-signal hover:text-signal-strong">
            {org.info.website.replace(/^https?:\/\//, '')}
          </a>
        ) : (
          '—'
        )}
      </Field>
      <Field label="Contact email">{org.info.contactEmail || '—'}</Field>
      <Field label="Time zone">{org.info.timezone}</Field>
      <Field label="Created">{formatDate(org.createdAt)}</Field>
      <div className="sm:col-span-2">
        <Field label="Organization ID">
          <span className="font-mono text-xs break-all">{org.organizationId}</span>
        </Field>
      </div>
    </dl>
  </>
)

/** The profile as a form. Saves, then returns to the read-only view. */
const ProfileForm = ({ org, onDone }: { org: Organization; onDone: () => void }) => {
  const { mutateAsync: update } = useUpdateOrganization()
  const [state, save] = useAsyncAction(
    (v: OrganizationFormValues) =>
      update({
        organizationName: v.organizationName,
        info: { description: v.description, website: v.website, contactEmail: v.contactEmail, timezone: v.timezone },
      }),
    { successMs: 500 },
  )
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrganizationFormValues>({
    resolver: yupResolver(organizationSchema),
    defaultValues: { organizationName: org.organizationName, ...org.info },
  })

  const onSubmit = (values: OrganizationFormValues) =>
    save(values)
      .then(() => {
        toast.success('Organization updated.')
        setTimeout(onDone, 500)
      })
      .catch((error: Error) => toast.error(error.message))

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <h2 className="font-semibold text-text">Edit profile</h2>
      <FormField id="organizationName" label="Name" error={errors.organizationName?.message}>
        <Input id="organizationName" hasError={!!errors.organizationName} {...register('organizationName')} />
      </FormField>
      <FormField id="description" label="Description" error={errors.description?.message}>
        <Textarea id="description" hasError={!!errors.description} {...register('description')} />
      </FormField>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField id="website" label="Website" error={errors.website?.message}>
          <Input id="website" type="url" placeholder="https://" hasError={!!errors.website} {...register('website')} />
        </FormField>
        <FormField id="contactEmail" label="Contact email" error={errors.contactEmail?.message}>
          <Input id="contactEmail" type="email" hasError={!!errors.contactEmail} {...register('contactEmail')} />
        </FormField>
      </div>
      <FormField id="timezone" label="Time zone" error={errors.timezone?.message}>
        <Select id="timezone" {...register('timezone')}>
          {TIME_ZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </Select>
      </FormField>
      <div className="flex justify-end gap-2 pt-1">
        <LoadingButton variant="ghost" onClick={onDone}>
          Cancel
        </LoadingButton>
        <LoadingButton type="submit" state={state} loadingText="Saving" successText="Saved">
          Save changes
        </LoadingButton>
      </div>
    </form>
  )
}

/** Usage against the plan's limits; the limits themselves are set by the N-Ops operator, not here. */
const PlanCard = ({ org }: { org: Organization }) => (
  <section className="rounded-xl border border-border bg-surface-raised p-5">
    <h2 className="mb-1 font-semibold text-text">Plan and usage</h2>
    <p className="mb-5 text-sm text-text-muted">Limits are set on your plan. Contact your N-Ops operator to raise them.</p>
    <div className="flex flex-col gap-4">
      <Meter label="Users" used={org.usage.users} total={org.limits.users} />
      <Meter label="Servers" used={org.usage.servers} total={org.limits.servers} />
      <Meter label="Workflows" used={org.usage.workflows} total={org.limits.workflows} />
      <Meter label="Vault projects" used={org.usage.vaultProjects} total={org.limits.vaultProjects} />
      <Meter label="AI credits" used={org.aiCredit.used} total={org.aiCredit.allocated} />
      <Meter label="Storage" used={org.storageBytes.used} total={org.storageBytes.allocated} format={formatBytes} />
    </div>
    <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
      <div>
        <dt className="text-text-muted">Secret keys per project</dt>
        <dd className="text-text">{formatNumber(org.limits.vaultKeysPerProject)}</dd>
      </div>
      <div>
        <dt className="text-text-muted">Notes per project</dt>
        <dd className="text-text">{formatNumber(org.limits.vaultNotesPerProject)}</dd>
      </div>
    </dl>
  </section>
)

/** Profile (view / edit) next to plan usage. */
export const AdminOrganizationPage = () => {
  const { data: org, isLoading, error } = useOrganization()
  const [editing, setEditing] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Organization" description="Your organization's profile and how much of your plan it uses." mock />
      {isLoading ? (
        <SkeletonText lines={8} />
      ) : error || !org ? (
        <p className="text-sm text-text-muted">Couldn't load the organization: {error?.message ?? 'no data'}</p>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
          <section className="rounded-xl border border-border bg-surface-raised p-5">
            {editing ? <ProfileForm org={org} onDone={() => setEditing(false)} /> : <ProfileView org={org} onEdit={() => setEditing(true)} />}
          </section>
          <PlanCard org={org} />
        </div>
      )}
    </div>
  )
}
