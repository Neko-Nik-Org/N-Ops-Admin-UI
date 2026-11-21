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
 * Super-admin dialogs for organizations: create, rename, plan limits, profile / billing details and
 * delete. The API checks almost nothing itself (see features/superAdmin/api/organizations.ts), so
 * every form validates before sending.
 */

import { yupResolver } from '@hookform/resolvers/yup'
import { Plus, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import {
  useFieldArray,
  useForm,
  type ArrayPath,
  type Control,
  type FieldArray,
  type FieldErrors,
  type FieldValues,
  type Path,
  type UseFormRegister,
} from 'react-hook-form'
import { toast } from 'react-toastify'
import * as yup from 'yup'
import { Input } from '@/components/atoms/Input'
import { Switch } from '@/components/atoms/Switch'
import { Dialog } from '@/components/molecules/Dialog'
import { FormField } from '@/components/molecules/FormField'
import { LoadingButton } from '@/components/molecules/LoadingButton'
import {
  useCheckOrganizationName,
  useCreateOrganization,
  useDeleteOrganization,
  useRenameOrganization,
  useUpdateOrganizationDetails,
  useUpdateOrganizationLimits,
} from '@/features/superAdmin/hooks/useOrganizations'
import type { Organization, OrganizationLimits } from '@/features/superAdmin/types'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { formatBytes, formatNumber } from '@/utils/format'

const GB = 1024 ** 3
/** The database's INTEGER columns. */
const INT_MAX = 2_147_483_647
const NAME_MAX = 250

// ── shared pieces ────────────────────────────────────────

const whole = (label: string, max = INT_MAX) =>
  yup
    .number()
    .typeError(`Enter a number for ${label}.`)
    .required(`Enter a number for ${label}.`)
    .integer('Use a whole number.')
    .min(1, 'At least 1.')
    .max(max, `At most ${formatNumber(max)}.`)

const limitsShape = {
  userLimit: whole('users'),
  serverLimit: whole('servers'),
  workflowLimit: whole('workflows'),
  vaultProjectLimit: whole('vault projects'),
  vaultKeysPerProjectLimit: whole('keys per project'),
  vaultNotesLimit: whole('notes'),
  aiCredit: whole('AI credit', Number.MAX_SAFE_INTEGER),
  storageGb: yup
    .number()
    .typeError('Enter the storage in GB.')
    .required('Enter the storage in GB.')
    .positive('More than 0.')
    .max(Math.floor(Number.MAX_SAFE_INTEGER / GB), 'Too large.'),
}

type LimitsValues = {
  userLimit: number
  serverLimit: number
  workflowLimit: number
  vaultProjectLimit: number
  vaultKeysPerProjectLimit: number
  vaultNotesLimit: number
  aiCredit: number
  storageGb: number
}

const toLimitsValues = (l: OrganizationLimits): LimitsValues => ({
  userLimit: l.userLimit,
  serverLimit: l.serverLimit,
  workflowLimit: l.workflowLimit,
  vaultProjectLimit: l.vaultProjectLimit,
  vaultKeysPerProjectLimit: l.vaultKeysPerProjectLimit,
  vaultNotesLimit: l.vaultNotesLimit,
  aiCredit: l.aiCredit,
  // shown in GB, to two decimals
  storageGb: Math.round((l.storageBytes / GB) * 100) / 100,
})

const fromLimitsValues = (v: LimitsValues): OrganizationLimits => ({
  userLimit: v.userLimit,
  serverLimit: v.serverLimit,
  workflowLimit: v.workflowLimit,
  vaultProjectLimit: v.vaultProjectLimit,
  vaultKeysPerProjectLimit: v.vaultKeysPerProjectLimit,
  vaultNotesLimit: v.vaultNotesLimit,
  aiCredit: v.aiCredit,
  storageBytes: Math.round(v.storageGb * GB),
})

/** An organization's current limits (its AI credit and storage are stored as used / allocated). */
const limitsOf = (org: Organization): OrganizationLimits => ({
  userLimit: org.userLimit,
  serverLimit: org.serverLimit,
  workflowLimit: org.workflowLimit,
  vaultProjectLimit: org.vaultProjectLimit,
  vaultKeysPerProjectLimit: org.vaultKeysPerProjectLimit,
  vaultNotesLimit: org.vaultNotesLimit,
  aiCredit: org.aiCredit.allocated,
  storageBytes: org.storageBytes.allocated,
})

/** A plan a new organization starts on; every value can be changed in the form. */
const DEFAULT_LIMITS: OrganizationLimits = {
  userLimit: 25,
  serverLimit: 50,
  workflowLimit: 20,
  vaultProjectLimit: 10,
  vaultKeysPerProjectLimit: 200,
  vaultNotesLimit: 100,
  aiCredit: 1000,
  storageBytes: 10 * GB,
}

const LIMIT_FIELDS: Array<[keyof LimitsValues, string, string?]> = [
  ['userLimit', 'Users'],
  ['serverLimit', 'Servers'],
  ['workflowLimit', 'Workflows'],
  ['vaultProjectLimit', 'Vault projects'],
  ['vaultKeysPerProjectLimit', 'Keys per project'],
  ['vaultNotesLimit', 'Vault notes'],
  ['aiCredit', 'AI credit'],
  ['storageGb', 'Storage (GB)', '0.01'],
]

/** The eight limit inputs, two per row. `field` is the form's path prefix ('' or 'limits.'). */
const LimitInputs = ({
  register,
  errors,
  prefix,
  hints = {},
}: {
  // the forms differ in shape; each passes its own register for the same field names
  register: UseFormRegister<any> // eslint-disable-line @typescript-eslint/no-explicit-any
  errors: FieldErrors<LimitsValues>
  prefix: string
  hints?: Partial<Record<keyof LimitsValues, string>>
}) => (
  <div className="grid grid-cols-2 gap-3">
    {LIMIT_FIELDS.map(([name, label, step]) => (
      <FormField key={name} id={`lim-${name}`} label={label} error={errors[name]?.message}>
        <Input
          id={`lim-${name}`}
          type="number"
          inputMode={step ? 'decimal' : 'numeric'}
          min={step ?? 1}
          step={step ?? 1}
          hasError={!!errors[name]}
          {...register(`${prefix}${name}`, { valueAsNumber: true })}
        />
        {hints[name] && !errors[name] && <p className="text-xs text-text-muted">{hints[name]}</p>}
      </FormField>
    ))}
  </div>
)

/** Free-form details as label / value rows. */
type DetailRow = { label: string; value: string }

const rowsShape = yup
  .array(
    yup.object({
      label: yup.string().trim().required('Enter a label.').max(60, 'At most 60 characters.'),
      value: yup.string().trim().max(1000, 'At most 1,000 characters.').default(''),
    }),
  )
  .max(30, 'At most 30 fields.')
  .test('unique', 'Each label can only be used once.', function unique(rows) {
    const seen = new Set<string>()
    for (const [i, r] of (rows ?? []).entries()) {
      const key = (r.label ?? '').trim().toLowerCase()
      if (!key) continue
      if (seen.has(key)) return this.createError({ path: `${this.path}[${i}].label`, message: 'This label is already used.' })
      seen.add(key)
    }
    return true
  })
  .default([])

/** Text values become rows; anything else (numbers, lists, objects) is kept as it was. */
const splitDetails = (details: Record<string, unknown>) => {
  const rows: DetailRow[] = []
  const kept: Record<string, unknown> = {}
  for (const [label, value] of Object.entries(details)) {
    if (typeof value === 'string') rows.push({ label, value })
    else kept[label] = value
  }
  return { rows, kept }
}

const joinDetails = (rows: DetailRow[], kept: Record<string, unknown>) => {
  const out: Record<string, unknown> = { ...kept }
  for (const { label, value } of rows) if (label.trim()) out[label.trim()] = value.trim()
  return out
}

const DetailRows = <T extends FieldValues>({
  control,
  register,
  errors,
  name,
  placeholder,
}: {
  control: Control<T>
  register: UseFormRegister<T>
  errors: FieldErrors<{ rows: DetailRow[] }>['rows']
  /** The form's array of rows (e.g. "profile"). */
  name: ArrayPath<T>
  placeholder: string
}) => {
  const { fields, append, remove } = useFieldArray({ control, name })
  /** Path of one cell, e.g. "profile.0.label". */
  const cell = (i: number, key: 'label' | 'value') => `${name}.${i}.${key}` as Path<T>
  return (
    <div className="flex flex-col gap-2">
      {fields.map((field, i) => {
        const e = errors?.[i]
        return (
          <div key={field.id} className="flex flex-col gap-1">
            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] items-start gap-2">
              <Input
                aria-label={`${name} label ${i + 1}`}
                placeholder="Label"
                hasError={!!e?.label}
                {...register(cell(i, 'label'))}
              />
              <Input
                aria-label={`${name} value ${i + 1}`}
                placeholder="Value"
                hasError={!!e?.value}
                {...register(cell(i, 'value'))}
              />
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove ${name} field ${i + 1}`}
                className="mt-2 rounded p-1 text-text-muted hover:text-danger"
              >
                <Trash2 size={15} />
              </button>
            </div>
            {(e?.label || e?.value) && <p className="text-sm text-danger">{e.label?.message ?? e.value?.message}</p>}
          </div>
        )
      })}
      {errors?.root?.message && <p className="text-sm text-danger">{errors.root.message}</p>}
      <div>
        <LoadingButton
          variant="ghost"
          size="sm"
          icon={<Plus size={14} />}
          onClick={() => append({ label: '', value: '' } as FieldArray<T, ArrayPath<T>>)}
        >
          Add field
        </LoadingButton>
      </div>
      {!fields.length && <p className="text-xs text-text-muted">{placeholder}</p>}
    </div>
  )
}

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <fieldset className="flex flex-col gap-3 border-t border-border pt-4">
    <legend className="contents">
      <span className="text-sm font-semibold text-text">{title}</span>
    </legend>
    {children}
  </fieldset>
)

const Buttons = ({
  onClose,
  state,
  label,
  danger,
}: {
  onClose: () => void
  state: ReturnType<typeof useAsyncAction>[0]
  label: string
  danger?: boolean
}) => (
  <div className="flex justify-end gap-2 pt-1">
    <LoadingButton variant="ghost" onClick={onClose}>
      Cancel
    </LoadingButton>
    <LoadingButton type="submit" variant={danger ? 'danger' : 'primary'} state={state} loadingText="Saving" successText="Done">
      {label}
    </LoadingButton>
  </div>
)

const nameField = () => yup.string().trim().required('Enter a name.').max(NAME_MAX, `At most ${NAME_MAX} characters.`)

/** Fails a form's name field when the API says the name is taken (the check is exact, as is the database). */
const useNameCheck = () => {
  const isAvailable = useCheckOrganizationName()
  return async (name: string): Promise<boolean> => {
    try {
      return await isAvailable(name)
    } catch {
      return true // only a courtesy check; the API still refuses a taken name
    }
  }
}

// ── create ───────────────────────────────────────────────

const createSchema = yup.object({
  organizationName: nameField(),
  isActive: yup.boolean().default(true),
  limits: yup.object(limitsShape),
  profile: rowsShape,
  billing: rowsShape,
})
type CreateValues = yup.InferType<typeof createSchema>

const CreateForm = ({ onClose, onCreated }: { onClose: () => void; onCreated?: (name: string) => void }) => {
  const { mutateAsync: create } = useCreateOrganization()
  const [state, save] = useAsyncAction(create, { successMs: 500 })
  const nameFree = useNameCheck()
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateValues>({
    resolver: yupResolver(createSchema),
    defaultValues: {
      organizationName: '',
      isActive: true,
      limits: toLimitsValues(DEFAULT_LIMITS),
      profile: [
        { label: 'website', value: '' },
        { label: 'contact_email', value: '' },
      ],
      billing: [],
    },
  })

  const onSubmit = async (v: CreateValues) => {
    if (!(await nameFree(v.organizationName))) {
      setError('organizationName', { message: 'That name is already taken.' })
      return
    }
    try {
      await save({
        organizationName: v.organizationName,
        isActive: v.isActive,
        organizationInfo: joinDetails(
          v.profile.filter((r) => r.value.trim()),
          {},
        ),
        billingInfo: joinDetails(v.billing, {}),
        ...fromLimitsValues(v.limits),
      })
      toast.success(`Created ${v.organizationName}.`)
      onCreated?.(v.organizationName)
      setTimeout(onClose, 500)
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <FormField id="orgName" label="Name" error={errors.organizationName?.message}>
        <Input
          id="orgName"
          autoComplete="off"
          maxLength={NAME_MAX}
          hasError={!!errors.organizationName}
          {...register('organizationName')}
        />
      </FormField>
      <Switch label="Active" description="People in a disabled organization can't sign in." {...register('isActive')} />
      <Section title="Plan limits">
        <LimitInputs register={register} errors={errors.limits ?? {}} prefix="limits." />
      </Section>
      <Section title="Profile">
        <DetailRows
          control={control}
          register={register}
          errors={errors.profile}
          name="profile"
          placeholder="Shown to the organization's admins (website, contact email, address…)."
        />
      </Section>
      <Section title="Billing">
        <DetailRows
          control={control}
          register={register}
          errors={errors.billing}
          name="billing"
          placeholder="Only super admins see this (GST number, plan, SLA…)."
        />
      </Section>
      <Buttons onClose={onClose} state={state} label="Create organization" />
    </form>
  )
}

export const NewOrganizationDialog = ({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated?: (name: string) => void
}) => (
  <Dialog open={open} onClose={onClose} size="lg" title="New organization" description="The API also creates its encryption key.">
    {open && <CreateForm onClose={onClose} onCreated={onCreated} />}
  </Dialog>
)

// ── rename ───────────────────────────────────────────────

const RenameForm = ({ org, onClose }: { org: Organization; onClose: () => void }) => {
  const { mutateAsync: rename } = useRenameOrganization()
  const [state, save] = useAsyncAction(rename, { successMs: 500 })
  const nameFree = useNameCheck()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<{ name: string }>({
    resolver: yupResolver(yup.object({ name: nameField() })),
    defaultValues: { name: org.organizationName },
  })

  const onSubmit = async ({ name }: { name: string }) => {
    if (name === org.organizationName) {
      setError('name', { message: "That's already its name." })
      return
    }
    if (!(await nameFree(name))) {
      setError('name', { message: 'That name is already taken.' })
      return
    }
    try {
      await save({ organizationId: org.organizationId, name })
      toast.success(`Renamed to ${name}.`)
      setTimeout(onClose, 500)
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <FormField id="orgNewName" label="New name" error={errors.name?.message}>
        <Input id="orgNewName" autoComplete="off" maxLength={NAME_MAX} hasError={!!errors.name} {...register('name')} />
      </FormField>
      <Buttons onClose={onClose} state={state} label="Rename" />
    </form>
  )
}

export const RenameOrganizationDialog = ({ org, onClose }: { org: Organization | null; onClose: () => void }) => (
  <Dialog open={!!org} onClose={onClose} title={org ? `Rename ${org.organizationName}` : ''}>
    {org && <RenameForm org={org} onClose={onClose} />}
  </Dialog>
)

// ── plan limits ──────────────────────────────────────────

const LimitsForm = ({ org, onClose }: { org: Organization; onClose: () => void }) => {
  const { mutateAsync: update } = useUpdateOrganizationLimits()
  const [state, save] = useAsyncAction(update, { successMs: 500 })
  // the API refuses AI credit or storage below what's used, so say so before sending
  const schema = yup.object({
    ...limitsShape,
    aiCredit: limitsShape.aiCredit.min(
      Math.max(1, org.aiCredit.used),
      `At least ${formatNumber(Math.max(1, org.aiCredit.used))}: that much is already used.`,
    ),
    storageGb: limitsShape.storageGb.test(
      'used',
      `At least ${formatBytes(org.storageBytes.used)}: that much is already used.`,
      (gb) => gb === undefined || Math.round(gb * GB) >= org.storageBytes.used,
    ),
  })
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LimitsValues>({ resolver: yupResolver(schema), defaultValues: toLimitsValues(limitsOf(org)) })

  const onSubmit = (v: LimitsValues) =>
    save({ organizationId: org.organizationId, limits: fromLimitsValues(v) })
      .then(() => {
        toast.success(`Updated the limits for ${org.organizationName}.`)
        setTimeout(onClose, 500)
      })
      .catch((error: Error) => toast.error(error.message))

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <LimitInputs
        register={register}
        errors={errors}
        prefix=""
        hints={{
          aiCredit: `${formatNumber(org.aiCredit.used)} used`,
          storageGb: `${formatBytes(org.storageBytes.used)} used`,
          userLimit: "Can't go below the number of users it has",
          vaultProjectLimit: "Can't go below the projects it has",
        }}
      />
      <Buttons onClose={onClose} state={state} label="Save limits" />
    </form>
  )
}

export const LimitsDialog = ({ org, onClose }: { org: Organization | null; onClose: () => void }) => (
  <Dialog open={!!org} onClose={onClose} size="lg" title={org ? `Plan limits for ${org.organizationName}` : ''}>
    {org && <LimitsForm org={org} onClose={onClose} />}
  </Dialog>
)

// ── profile / billing details ────────────────────────────

const DetailsForm = ({ org, which, onClose }: { org: Organization; which: 'profile' | 'billing'; onClose: () => void }) => {
  const { rows, kept } = splitDetails(which === 'profile' ? org.organizationInfo : org.billingInfo)
  const { mutateAsync: update } = useUpdateOrganizationDetails()
  const [state, save] = useAsyncAction(update, { successMs: 500 })
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<{ rows: DetailRow[] }>({ resolver: yupResolver(yup.object({ rows: rowsShape })), defaultValues: { rows } })

  const onSubmit = (v: { rows: DetailRow[] }) =>
    save({ organizationId: org.organizationId, which, details: joinDetails(v.rows, kept) })
      .then(() => {
        toast.success(`Saved the ${which} details for ${org.organizationName}.`)
        setTimeout(onClose, 500)
      })
      .catch((error: Error) => toast.error(error.message))

  const keptCount = Object.keys(kept).length
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <DetailRows
        control={control}
        register={register}
        errors={errors.rows}
        name="rows"
        placeholder={which === 'profile' ? 'No profile details yet.' : 'No billing details yet.'}
      />
      {keptCount > 0 && (
        <p className="text-xs text-text-muted">
          {keptCount === 1 ? '1 other saved value is' : `${keptCount} other saved values are`} kept as they are.
        </p>
      )}
      <Buttons onClose={onClose} state={state} label="Save details" />
    </form>
  )
}

export const DetailsDialog = ({
  org,
  which,
  onClose,
}: {
  org: Organization | null
  which: 'profile' | 'billing'
  onClose: () => void
}) => (
  <Dialog
    open={!!org}
    onClose={onClose}
    size="lg"
    title={org ? `${which === 'profile' ? 'Profile' : 'Billing'} details for ${org.organizationName}` : ''}
    description={which === 'profile' ? "Shown to the organization's own admins." : 'Only super admins see these.'}
  >
    {org && <DetailsForm key={which} org={org} which={which} onClose={onClose} />}
  </Dialog>
)

// ── delete ───────────────────────────────────────────────

const DeleteForm = ({ org, onClose, onDeleted }: { org: Organization; onClose: () => void; onDeleted: () => void }) => {
  const { mutateAsync: remove } = useDeleteOrganization()
  const [state, run] = useAsyncAction(remove, { successMs: 500 })
  const [typed, setTyped] = useState('')
  const matches = typed === org.organizationName

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!matches) return
        run(org.organizationId)
          .then(() => {
            toast.success(`Deleted ${org.organizationName}.`)
            setTimeout(onDeleted, 500)
          })
          .catch((error: Error) => toast.error(error.message))
      }}
      className="flex flex-col gap-4"
      noValidate
    >
      <p className="text-sm text-text-muted">
        This permanently deletes <span className="font-medium text-text">{org.organizationName}</span> and everything in it: its
        users, roles, tags, API keys and all Vault data. It can't be undone.
      </p>
      <FormField id="orgDeleteConfirm" label={`Type ${org.organizationName} to confirm`}>
        <Input
          id="orgDeleteConfirm"
          autoComplete="off"
          spellCheck={false}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
      </FormField>
      <div className="flex justify-end gap-2 pt-1">
        <LoadingButton variant="ghost" onClick={onClose}>
          Cancel
        </LoadingButton>
        <LoadingButton
          type="submit"
          variant="danger"
          state={state}
          disabled={!matches}
          loadingText="Deleting"
          successText="Deleted"
        >
          Delete organization
        </LoadingButton>
      </div>
    </form>
  )
}

export const DeleteOrganizationDialog = ({
  org,
  onClose,
  onDeleted,
}: {
  org: Organization | null
  onClose: () => void
  onDeleted: () => void
}) => (
  <Dialog open={!!org} onClose={onClose} title="Delete organization">
    {org && <DeleteForm org={org} onClose={onClose} onDeleted={onDeleted} />}
  </Dialog>
)
