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
/** Field groups shared by the organization create and edit forms: plan limits, the profile and label / value rows. */

import { Plus, Trash2 } from 'lucide-react'
import {
  useFieldArray,
  type ArrayPath,
  type Control,
  type FieldArray,
  type FieldErrors,
  type FieldValues,
  type Path,
  type UseFormRegister,
} from 'react-hook-form'
import { FormField } from '@/components/FormField'
import { Input } from '@/components/Input'
import { LoadingButton } from '@/components/LoadingButton'
import { Select } from '@/components/Select'
import { Textarea } from '@/components/Textarea'
import { COUNTRY_OPTIONS } from '@/constants/countries'
import {
  COMPANY_SIZES,
  INDUSTRIES,
  ORG_PROFILE_FIELDS,
  ORG_PROFILE_GROUPS,
  type OrgProfileField,
  type OrgProfileValues,
} from '@/utils/orgProfile'
import { timeZones } from '@/utils/profileDetails'
import type { DetailRow, LimitsValues } from './organizationValidation'

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

/** The eight limit inputs. `prefix` is the form's path to the limits object, e.g. "limits.". */
export const LimitInputs = ({
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
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    {LIMIT_FIELDS.map(([name, label, step]) => (
      <FormField key={name} id={`lim-${name}`} label={label} error={errors[name]?.message} required>
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

/** Label / value rows a form can add to and remove from. */
export const DetailRows = <T extends FieldValues>({
  control,
  register,
  errors,
  name,
  placeholder,
}: {
  control: Control<T>
  register: UseFormRegister<T>
  errors: FieldErrors<{ rows: DetailRow[] }>['rows']
  /** The form's array of rows (e.g. "billing"). */
  name: ArrayPath<T>
  placeholder: string
}) => {
  const { fields, append, remove } = useFieldArray({ control, name })
  /** Path of one cell, e.g. "billing.0.label". */
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

/** "N other saved values are kept", for details the form can't show as text. */
export const KeptNote = ({ count }: { count: number }) =>
  count > 0 ? (
    <p className="text-xs text-text-muted">
      {count === 1 ? '1 other saved value is' : `${count} other saved values are`} kept as they are.
    </p>
  ) : null

/** The structured profile inputs, grouped. `prefix` is the form path of the profile object, e.g. "profile.". */
export const OrgProfileFields = ({
  register,
  errors,
  prefix,
  timezone,
}: {
  // the create and edit forms differ in shape; each passes its own register for the same field names
  register: UseFormRegister<any> // eslint-disable-line @typescript-eslint/no-explicit-any
  errors: FieldErrors<OrgProfileValues> | undefined
  prefix: string
  /** The saved time zone, kept in the list even if this browser doesn't know it. */
  timezone?: string
}) => {
  const zones = [...new Set([...timeZones(), 'UTC', ...(timezone ? [timezone] : [])])].sort()
  const input = (f: OrgProfileField) => {
    const id = `orgp-${f.key}`
    const props = { id, hasError: !!errors?.[f.key], ...register(`${prefix}${f.key}`) }
    switch (f.kind) {
      case 'textarea':
        return <Textarea rows={f.key === 'description' ? 3 : 2} maxLength={f.max} placeholder={f.placeholder} {...props} />
      case 'industry':
      case 'size':
        return (
          <Select {...props}>
            <option value="">Not set</option>
            {(f.kind === 'industry' ? INDUSTRIES : COMPANY_SIZES).map((o) => (
              <option key={o} value={o}>
                {f.kind === 'size' ? `${o} people` : o}
              </option>
            ))}
          </Select>
        )
      case 'country':
        return (
          <Select {...props}>
            <option value="">Not set</option>
            {COUNTRY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        )
      case 'timezone':
        return (
          <Select {...props}>
            <option value="">Not set</option>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, ' ')}
              </option>
            ))}
          </Select>
        )
      default:
        return (
          <Input
            type={f.kind === 'url' ? 'url' : f.kind}
            inputMode={f.kind === 'url' ? 'url' : f.kind === 'email' ? 'email' : f.kind === 'tel' ? 'tel' : undefined}
            autoComplete="off"
            maxLength={f.max}
            placeholder={f.placeholder}
            {...props}
          />
        )
    }
  }
  return (
    <>
      {ORG_PROFILE_GROUPS.map((group) => (
        <fieldset key={group} className="flex flex-col gap-3">
          <legend className="mb-1 text-xs font-medium tracking-wide text-text-muted uppercase">{group}</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ORG_PROFILE_FIELDS.filter((f) => f.group === group).map((f) => (
              <div key={f.key} className={f.kind === 'textarea' ? 'sm:col-span-2' : undefined}>
                <FormField id={`orgp-${f.key}`} label={f.label} error={errors?.[f.key]?.message}>
                  {input(f)}
                  {f.hint && !errors?.[f.key] && <p className="text-xs text-text-muted">{f.hint}</p>}
                </FormField>
              </div>
            ))}
          </div>
        </fieldset>
      ))}
    </>
  )
}
