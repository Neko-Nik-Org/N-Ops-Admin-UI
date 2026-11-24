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
 * The profile details inputs (work, contact, availability, engineering and other fields), in the
 * structure from utils/profileDetails.ts. Used by the details editor and the add-user
 * form; `prefix` is where the details sit in the host form's values (e.g. "details.").
 */

import { Plus, Trash2 } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import {
  useFieldArray,
  type Control,
  type FieldError,
  type FieldErrors,
  type FieldValues,
  type UseFormRegister,
} from 'react-hook-form'
import { Input } from '@/components/Input'
import { Select } from '@/components/Select'
import { Textarea } from '@/components/Textarea'
import { FormField } from '@/components/FormField'
import { LoadingButton } from '@/components/LoadingButton'
import { browserTimeZone, timeZones, WEEKDAY_LABELS, WEEKDAYS } from '@/utils/profileDetails'
import { DETAIL_FIELDS_MAX, type ProfileDetailsFormValues } from '@/utils/validation'

const Group = ({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) => (
  <fieldset className="flex flex-col gap-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
    <legend className="contents">
      <span className="text-sm font-semibold text-text">{title}</span>
    </legend>
    {hint && <p className="-mt-2 text-xs text-text-muted">{hint}</p>}
    {children}
  </fieldset>
)

const Grid = ({ children }: { children: ReactNode }) => <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>

export const ProfileDetailsFields = <T extends FieldValues>({
  register: hostRegister,
  control: hostControl,
  errors,
  prefix = '',
  timezone,
  preservedCount = 0,
}: {
  register: UseFormRegister<T>
  control: Control<T>
  errors: FieldErrors<ProfileDetailsFormValues> | undefined
  /** Path of the details in the host form, e.g. "details."; '' when the form is only the details. */
  prefix?: string
  /** The saved time zone, kept in the list even if this browser doesn't know it. */
  timezone?: string
  /** How many saved values the editor doesn't show (they're saved back unchanged). */
  preservedCount?: number
}) => {
  // the fields' paths depend on `prefix`, so they're registered by string rather than typed path
  const register = hostRegister as unknown as UseFormRegister<FieldValues>
  const control = hostControl as unknown as Control<FieldValues>
  // the browser's list can miss a saved zone (older names like Asia/Calcutta, or UTC), so add it back
  const zones = useMemo(
    () => [...new Set([...timeZones(), 'UTC', browserTimeZone(), timezone ?? ''].filter(Boolean))].sort(),
    [timezone],
  )
  const { fields: custom, append, remove } = useFieldArray({ control, name: `${prefix}custom` })
  const idPrefix = `pd-${prefix}`
  const e = errors ?? {}

  /** One text input bound to `name`, with its label and error. */
  const field = (name: string, label: string, error: FieldError | undefined, props: object = {}) => (
    <FormField id={`${idPrefix}${name}`} label={label} error={error?.message}>
      <Input id={`${idPrefix}${name}`} autoComplete="off" hasError={!!error} {...props} {...register(`${prefix}${name}`)} />
    </FormField>
  )

  return (
    <>
      <Group title="Work">
        <Grid>
          {field('work.jobTitle', 'Job title', e.work?.jobTitle, { placeholder: 'Site reliability engineer' })}
          {field('work.department', 'Department or team', e.work?.department, { placeholder: 'Platform' })}
          {field('work.employeeId', 'Employee id', e.work?.employeeId)}
          {field('work.location', 'Office or location', e.work?.location, { placeholder: 'Bengaluru' })}
        </Grid>
      </Group>

      <Group title="Contact">
        <Grid>
          {field('contact.phone', 'Phone', e.contact?.phone, { type: 'tel', placeholder: '+91 98765 43210' })}
          {field('contact.chatHandle', 'Chat handle', e.contact?.chatHandle, { placeholder: '@priya on Slack' })}
        </Grid>
        {field('contact.alternateEmail', 'Other email', e.contact?.alternateEmail, { type: 'email' })}
      </Group>

      <Group title="Availability" hint="Helps others see whether it's working hours for you before they reach out.">
        <FormField id={`${idPrefix}timezone`} label="Time zone" error={e.availability?.timezone?.message}>
          <Select
            id={`${idPrefix}timezone`}
            hasError={!!e.availability?.timezone}
            {...register(`${prefix}availability.timezone`)}
          >
            <option value="">Not set</option>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, ' ')}
              </option>
            ))}
          </Select>
        </FormField>
        <Grid>
          {field('availability.workStart', 'Working hours from', e.availability?.workStart, { type: 'time' })}
          {field('availability.workEnd', 'to', e.availability?.workEnd, { type: 'time' })}
        </Grid>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-text-muted">Working days</span>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => (
              <label
                key={day}
                className="cursor-pointer rounded-full border border-border px-3 py-1 text-xs text-text-muted has-checked:border-signal has-checked:bg-signal/10 has-checked:text-signal has-[:focus-visible]:border-signal"
              >
                <input type="checkbox" value={day} className="sr-only" {...register(`${prefix}availability.workDays`)} />
                {WEEKDAY_LABELS[day]}
              </label>
            ))}
          </div>
        </div>
      </Group>

      <Group title="Engineering">
        <Grid>
          {field('engineering.githubUsername', 'GitHub username', e.engineering?.githubUsername, { spellCheck: false })}
          {field('engineering.gitlabUsername', 'GitLab username', e.engineering?.gitlabUsername, { spellCheck: false })}
        </Grid>
        {field('engineering.expertise', 'Expertise', e.engineering?.expertise, {
          placeholder: 'PostgreSQL, Kubernetes, nginx',
        })}
        <FormField id={`${idPrefix}ssh`} label="SSH public keys" error={e.engineering?.sshPublicKeys?.message}>
          <Textarea
            id={`${idPrefix}ssh`}
            rows={3}
            spellCheck={false}
            placeholder="ssh-ed25519 AAAAC3Nza… you@laptop"
            className="font-mono text-xs"
            hasError={!!e.engineering?.sshPublicKeys}
            {...register(`${prefix}engineering.sshPublicKeys`)}
          />
          {!e.engineering?.sshPublicKeys && (
            <p className="text-xs text-text-muted">One public key per line. Never paste a private key.</p>
          )}
        </FormField>
      </Group>

      <Group title="Other" hint="Anything else worth knowing, as label and value.">
        {custom.length > 0 && (
          <ul className="flex flex-col gap-3">
            {custom.map((row, index) => {
              const rowErrors = e.custom?.[index]
              return (
                <li key={row.id} className="flex flex-col gap-1">
                  <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] items-start gap-2">
                    <Input
                      aria-label={`Label ${index + 1}`}
                      placeholder="Label"
                      autoComplete="off"
                      hasError={!!rowErrors?.label}
                      {...register(`${prefix}custom.${index}.label`)}
                    />
                    <Input
                      aria-label={`Value ${index + 1}`}
                      placeholder="Value"
                      autoComplete="off"
                      hasError={!!rowErrors?.value}
                      {...register(`${prefix}custom.${index}.value`)}
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
                  {(rowErrors?.label || rowErrors?.value) && (
                    <p className="text-sm text-danger" role="alert">
                      {rowErrors.label?.message ?? rowErrors.value?.message}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {e.custom?.root?.message && (
          <p className="text-sm text-danger" role="alert">
            {e.custom.root.message}
          </p>
        )}
        <div>
          <LoadingButton
            variant="ghost"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => append({ label: '', value: '' })}
            disabled={custom.length >= DETAIL_FIELDS_MAX}
          >
            Add field
          </LoadingButton>
        </div>
        {preservedCount > 0 && (
          <p className="text-xs text-text-muted">
            {preservedCount === 1 ? '1 other saved value is' : `${preservedCount} other saved values are`} kept as they are.
          </p>
        )}
      </Group>
    </>
  )
}
