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
 * Editor for the signed-in user's profile details (`/user/self/details`), in the structure from
 * features/account/profileDetails.ts. Values it doesn't know are saved back unchanged.
 */

import { yupResolver } from '@hookform/resolvers/yup'
import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, type ReactNode } from 'react'
import { useFieldArray, useForm, type FieldError } from 'react-hook-form'
import { toast } from 'react-toastify'
import { Input } from '@/components/atoms/Input'
import { Select } from '@/components/atoms/Select'
import { Textarea } from '@/components/atoms/Textarea'
import { Dialog } from '@/components/molecules/Dialog'
import { FormField } from '@/components/molecules/FormField'
import { LoadingButton } from '@/components/molecules/LoadingButton'
import { useSaveUserDetails } from '@/features/account/hooks/useAccount'
import {
  browserTimeZone,
  parseProfileDetails,
  serializeProfileDetails,
  timeZones,
  WEEKDAY_LABELS,
  WEEKDAYS,
  type ProfileDetails,
  type Weekday,
} from '@/features/account/profileDetails'
import {
  DETAIL_FIELDS_MAX,
  profileDetailsSchema,
  splitLines,
  splitList,
  type ProfileDetailsFormValues,
} from '@/features/account/schema/accountSchemas'
import type { JsonObject } from '@/features/account/types'
import { useAsyncAction } from '@/hooks/useAsyncAction'

/** Saved details → form values (lists become text). */
const toForm = (d: ProfileDetails): ProfileDetailsFormValues => ({
  ...d,
  engineering: {
    ...d.engineering,
    expertise: d.engineering.expertise.join(', '),
    sshPublicKeys: d.engineering.sshPublicKeys.join('\n'),
  },
})

/** Form values → details (text back to lists). */
const fromForm = (v: ProfileDetailsFormValues): ProfileDetails => ({
  ...v,
  availability: {
    ...v.availability,
    workDays: v.availability.workDays.filter((x): x is Weekday => (WEEKDAYS as readonly string[]).includes(x)),
  },
  engineering: {
    ...v.engineering,
    expertise: splitList(v.engineering.expertise),
    sshPublicKeys: splitLines(v.engineering.sshPublicKeys),
  },
  custom: v.custom.filter((c) => c.label.trim()),
})

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

export const ProfileDetailsDialog = ({ open, details, onClose }: { open: boolean; details: JsonObject; onClose: () => void }) => {
  const { details: saved, preserved } = useMemo(() => parseProfileDetails(details), [details])
  // the browser's list can miss a saved zone (older names like Asia/Calcutta, or UTC), so add it back
  const zones = useMemo(
    () => [...new Set([...timeZones(), 'UTC', browserTimeZone(), saved.availability.timezone].filter(Boolean))].sort(),
    [saved.availability.timezone],
  )
  const { mutateAsync } = useSaveUserDetails()
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileDetailsFormValues>({ resolver: yupResolver(profileDetailsSchema), defaultValues: toForm(saved) })
  const { fields: custom, append, remove } = useFieldArray({ control, name: 'custom' })

  // start from what's saved each time it opens; suggest the browser's time zone if none is set
  useEffect(() => {
    if (!open) return
    const start = toForm(saved)
    if (!start.availability.timezone) start.availability.timezone = browserTimeZone()
    reset(start)
  }, [open, saved, reset])

  const [saveState, save] = useAsyncAction(
    (values: ProfileDetailsFormValues) => mutateAsync(serializeProfileDetails(fromForm(values), preserved)),
    { successMs: 500 },
  )
  const onSubmit = (values: ProfileDetailsFormValues) =>
    save(values)
      .then(() => {
        toast.success('Profile details saved.')
        setTimeout(onClose, 500)
      })
      .catch((error: Error) => toast.error(error.message))

  /** One text input bound to `name`, with its label and error. */
  const field = (name: Parameters<typeof register>[0], label: string, error: FieldError | undefined, props: object = {}) => (
    <FormField id={`pd-${name}`} label={label} error={error?.message}>
      <Input id={`pd-${name}`} autoComplete="off" hasError={!!error} {...props} {...register(name)} />
    </FormField>
  )
  const e = errors
  const preservedCount = Object.keys(preserved).length

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Edit profile details"
      description="Visible to your organization's admins. Fill in what's useful; everything is optional."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
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
          <FormField id="pd-timezone" label="Time zone" error={e.availability?.timezone?.message}>
            <Select id="pd-timezone" hasError={!!e.availability?.timezone} {...register('availability.timezone')}>
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
                  <input type="checkbox" value={day} className="sr-only" {...register('availability.workDays')} />
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
          <FormField id="pd-ssh" label="SSH public keys" error={e.engineering?.sshPublicKeys?.message}>
            <Textarea
              id="pd-ssh"
              rows={3}
              spellCheck={false}
              placeholder="ssh-ed25519 AAAAC3Nza… you@laptop"
              className="font-mono text-xs"
              hasError={!!e.engineering?.sshPublicKeys}
              {...register('engineering.sshPublicKeys')}
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
                        {...register(`custom.${index}.label`)}
                      />
                      <Input
                        aria-label={`Value ${index + 1}`}
                        placeholder="Value"
                        autoComplete="off"
                        hasError={!!rowErrors?.value}
                        {...register(`custom.${index}.value`)}
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
