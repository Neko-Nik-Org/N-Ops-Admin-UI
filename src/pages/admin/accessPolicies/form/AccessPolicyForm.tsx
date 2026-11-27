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
/** Create / edit form for access policies: required 2FA methods and IP / country sign-in limits. */

import { yupResolver } from '@hookform/resolvers/yup'
import { Check, Pencil, Plus, ShieldCheck, X } from 'lucide-react'
import { useState, type ClipboardEvent, type KeyboardEvent, type ReactNode } from 'react'
import { Controller, useFieldArray, useForm, useWatch, type Control, type FieldErrors } from 'react-hook-form'
import { toast } from 'react-toastify'
import { Badge } from '@/components/Badge'
import { Input } from '@/components/Input'
import { Switch } from '@/components/Switch'
import { Textarea } from '@/components/Textarea'
import { FormField } from '@/components/FormField'
import { MultiSelect } from '@/components/MultiSelect'
import { COUNTRY_OPTIONS, countryName } from '@/constants/countries'
import { LoadingButton } from '@/components/LoadingButton'
import { Skeleton } from '@/components/Skeleton'
import { useAccessPolicies, useAccessPolicy, useCreateAccessPolicy, useUpdateAccessPolicy } from '@/hooks/useAccessPolicies'
import {
  accessPolicySchema,
  MAX_POLICY_IPS,
  type AccessPolicyFormValues,
} from '@/pages/admin/accessPolicies/form/accessPolicyValidation'
import { checkCidr, describeCidr, isValidCidr, normalizeCidr } from '@/utils/cidr'
import { type AccessPolicy, type AccessPolicyInput } from '@/types/accessPolicy'
import { useAsyncAction } from '@/hooks/useAsyncAction'

/** A titled card holding one group of fields. */
const Card = ({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) => (
  <fieldset className="flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-surface-raised p-5">
    <legend className="contents">
      <span className="text-sm font-semibold text-text">{title}</span>
    </legend>
    {hint && <p className="-mt-3 text-xs text-text-muted">{hint}</p>}
    {children}
  </fieldset>
)

/** Splits pasted or typed text into entries: commas, semicolons, spaces and new lines all separate. */
const splitEntries = (text: string) => text.split(/[\s,;]+/).filter(Boolean)

/**
 * The policy's allowed IPs: one input plus "+" (or Enter) to add an address or CIDR range, and the
 * added entries listed below with what each covers. An entry is checked when it's added, so the list
 * only holds valid, normalized, unique entries. Typing or pasting several at once adds them all and
 * leaves any that can't be added in the input, with the reason.
 */
/** What's typed in the IP input but not added yet, and why it couldn't be added. */
type IpDraft = { text: string; error: { message: string; suggestion?: string } | null }

const IpListField = ({
  control,
  errors,
  draft: { text: draft, error: draftError },
  onDraft,
}: {
  control: Control<AccessPolicyFormValues>
  errors: FieldErrors<AccessPolicyFormValues>
  draft: IpDraft
  onDraft: (draft: IpDraft) => void
}) => {
  const { fields, append, remove, update } = useFieldArray({ control, name: 'allowedIps' })
  /** The row being edited in place, with its text and why it can't be saved yet. */
  const [editing, setEditing] = useState<{
    index: number
    text: string
    error: { message: string; suggestion?: string } | null
  } | null>(null)

  /** Saves the edited row (or `text`, e.g. a suggested fix): checked like a new entry, unique among the others. */
  const saveEdit = (text = editing?.text ?? '') => {
    if (!editing) return
    const check = checkCidr(text)
    if (!check.ok) {
      setEditing({ ...editing, text, error: { message: check.error, suggestion: check.suggestion } })
      return
    }
    if (fields.some((f, j) => j !== editing.index && f.value === check.value)) {
      setEditing({ ...editing, text, error: { message: `${check.value} is already in the list.` } })
      return
    }
    if (check.value !== fields[editing.index]?.value) update(editing.index, { value: check.value })
    setEditing(null)
  }
  const listError = errors.allowedIps?.message ?? errors.allowedIps?.root?.message
  const live = draft.trim() && splitEntries(draft).length === 1 ? checkCidr(draft) : null

  /** Adds every entry in `text`; returns what couldn't be added (kept in the input) with the first reason. */
  const add = (text: string) => {
    const taken = new Set(fields.map((f) => f.value))
    const added: string[] = []
    const left: string[] = []
    let problem: { message: string; suggestion?: string } | null = null
    for (const entry of splitEntries(text)) {
      const check = checkCidr(entry)
      const reason = !check.ok
        ? { message: check.error, suggestion: check.suggestion }
        : taken.has(check.value)
          ? { message: `${check.value} is already in the list.` }
          : taken.size >= MAX_POLICY_IPS
            ? { message: `A policy can hold at most ${MAX_POLICY_IPS} entries.` }
            : null
      if (reason || !check.ok) {
        left.push(entry)
        problem ??= reason
        continue
      }
      taken.add(check.value)
      added.push(check.value)
    }
    if (added.length)
      append(
        added.map((value) => ({ value })),
        { shouldFocus: false },
      )
    onDraft({ text: left.join(', '), error: problem })
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault() // add, don't submit the form
    if (draft.trim()) add(draft)
  }

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text')
    if (splitEntries(text).length < 2) return
    e.preventDefault()
    add(`${draft} ${text}`)
  }

  return (
    <div className="flex flex-col gap-3">
      <FormField id="allowedIpInput" required label="Allowed IP addresses and ranges" error={draftError?.message}>
        <div className="flex items-start gap-2">
          <Input
            id="allowedIpInput"
            value={draft}
            placeholder="203.0.113.0/24 or 198.51.100.7"
            autoComplete="off"
            spellCheck={false}
            className="flex-1 font-mono"
            hasError={!!draftError}
            onChange={(e) => onDraft({ text: e.target.value, error: null })}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
          />
          <LoadingButton
            variant="secondary"
            icon={<Plus size={15} />}
            aria-label="Add IP or range"
            title="Add"
            disabled={!draft.trim() || fields.length >= MAX_POLICY_IPS}
            onClick={() => add(draft)}
          />
        </div>
        {draftError?.suggestion ? (
          <button
            type="button"
            className="self-start text-xs font-medium text-signal hover:underline"
            onClick={() => add(draftError.suggestion!)}
          >
            Add {draftError.suggestion} instead
          </button>
        ) : (
          !draftError && (
            <p className="font-mono text-xs text-text-muted">
              {live?.ok
                ? `${describeCidr(draft)} · press Enter to add`
                : 'IPv4 or IPv6, a single address or a CIDR range like 10.0.0.0/8. Paste a list to add several.'}
            </p>
          )
        )}
      </FormField>

      {fields.length > 0 ? (
        <ul aria-label="Allowed IP addresses" className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {fields.map((field, i) =>
            editing?.index === i ? (
              <li key={field.id} className="flex flex-col gap-1 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Input
                    aria-label={`Edit ${field.value}`}
                    value={editing.text}
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                    className="flex-1 font-mono"
                    hasError={!!editing.error}
                    onChange={(e) => setEditing({ index: i, text: e.target.value, error: null })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault() // save the entry, not the form
                        saveEdit()
                      } else if (e.key === 'Escape') {
                        e.preventDefault()
                        e.stopPropagation()
                        setEditing(null)
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => saveEdit()}
                    aria-label="Save this entry"
                    title="Save"
                    className="shrink-0 rounded-md p-1.5 text-signal hover:bg-surface"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    aria-label="Cancel editing"
                    title="Cancel"
                    className="shrink-0 rounded-md p-1.5 text-text-muted hover:bg-surface hover:text-text"
                  >
                    <X size={16} />
                  </button>
                </div>
                {editing.error ? (
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-danger" role="alert">
                    {editing.error.message}
                    {editing.error.suggestion && (
                      <button
                        type="button"
                        className="font-medium text-signal hover:underline"
                        onClick={() => saveEdit(editing.error!.suggestion)}
                      >
                        Use {editing.error.suggestion}
                      </button>
                    )}
                  </p>
                ) : (
                  <p className="font-mono text-xs text-text-muted">
                    {checkCidr(editing.text).ok ? describeCidr(editing.text) : 'Enter saves, Escape cancels.'}
                  </p>
                )}
              </li>
            ) : (
              <li key={field.id} className="flex items-center gap-1 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm text-text">{field.value}</p>
                  <p className="truncate font-mono text-xs text-text-muted">{describeCidr(field.value)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing({ index: i, text: field.value, error: null })}
                  aria-label={`Edit ${field.value}`}
                  title="Edit"
                  className="shrink-0 rounded-md p-1.5 text-text-muted hover:bg-surface hover:text-text"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null)
                    remove(i)
                  }}
                  aria-label={`Remove ${field.value}`}
                  title="Remove"
                  className="shrink-0 rounded-md p-1.5 text-text-muted hover:bg-surface hover:text-danger"
                >
                  <X size={16} />
                </button>
              </li>
            ),
          )}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-text-muted">
          No addresses added yet.
        </p>
      )}
      {listError && (
        <p className="text-sm text-danger" role="alert">
          {listError}
        </p>
      )}
    </div>
  )
}

/** Plain-language list: "a, b and c". */
const joinWords = (items: string[]) =>
  items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`

/** What the policy will do, updated as the form changes. */
const PolicySummary = ({ control }: { control: Control<AccessPolicyFormValues> }) => {
  const [name, totp, email, deviceLogins, hasIp, ips, hasGeo, countries] = useWatch({
    control,
    name: [
      'policyName',
      'enforceTotp2fa',
      'enforceEmail2fa',
      'allowDeviceLogins',
      'hasIpRestriction',
      'allowedIps',
      'hasGeoRestriction',
      'allowedGeoLocations',
    ],
  })
  const ipList = hasIp
    ? [
        ...new Set(
          (ips ?? [])
            .map((r) => r?.value?.trim() ?? '')
            .filter(isValidCidr)
            .map(normalizeCidr),
        ),
      ]
    : []
  const countryList = hasGeo ? (countries ?? []) : []
  const factors = [totp && 'an authenticator app', email && 'an email code'].filter(Boolean) as string[]
  const places = [
    ipList.length && `${ipList.length === 1 ? '1 IP address or range' : `${ipList.length} IP addresses or ranges`}`,
    countryList.length && joinWords(countryList.map((c) => countryName(c))),
  ].filter(Boolean) as string[]

  return (
    <aside className="flex flex-col gap-4 rounded-xl border border-border bg-surface-raised p-5 xl:sticky xl:top-20">
      <div className="flex items-center gap-2 text-sm font-semibold text-text">
        <ShieldCheck size={16} aria-hidden="true" className="text-signal" />
        Summary
      </div>
      <p className="text-sm text-text-muted">
        Users with <span className="font-medium text-text">{name?.trim() || 'this policy'}</span>{' '}
        {factors.length ? `must sign in with ${joinWords(factors)}` : 'need no second factor'}, and can sign in{' '}
        {places.length ? `only from ${joinWords(places)}` : 'from anywhere'}.
      </p>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 border-t border-border pt-4 text-sm">
        <dt className="text-text-muted">2FA</dt>
        <dd className="flex flex-wrap gap-1">
          {factors.length ? (
            <>
              {totp && <Badge tone="signal">Authenticator app</Badge>}
              {email && <Badge tone="signal">Email code</Badge>}
            </>
          ) : (
            <span className="text-text-muted">Not required</span>
          )}
        </dd>
        <dt className="text-text-muted">Mobile app</dt>
        <dd>{deviceLogins ? <Badge tone="signal">Allowed</Badge> : <span className="text-text-muted">Not allowed</span>}</dd>
        <dt className="text-text-muted">IPs</dt>
        <dd className="flex flex-wrap gap-1">
          {ipList.length ? (
            ipList.slice(0, 6).map((ip) => (
              <Badge key={ip} tone="accent" mono>
                {ip}
              </Badge>
            ))
          ) : (
            <span className="text-text-muted">Any</span>
          )}
          {ipList.length > 6 && <span className="text-xs text-text-muted">+{ipList.length - 6} more</span>}
        </dd>
        <dt className="text-text-muted">Countries</dt>
        <dd className="flex flex-wrap gap-1">
          {countryList.length ? (
            countryList.map((c) => (
              <Badge key={c} tone="accent" mono>
                {c}
              </Badge>
            ))
          ) : (
            <span className="text-text-muted">Any</span>
          )}
        </dd>
      </dl>
      {(hasIp && !ipList.length) || (hasGeo && !countryList.length) ? (
        <p className="text-xs text-warning">A switched-on limit needs at least one entry before it can be saved.</p>
      ) : null}
    </aside>
  )
}

/** The form, editing `policy` (as given) or creating one, optionally pre-filled from `template`. */
const PolicyForm = ({
  policy,
  template,
  onSaved,
  onCancel,
}: {
  policy?: AccessPolicy
  template?: AccessPolicy
  /** Called a moment after a successful save, with the saved name. */
  onSaved: (name: string) => void
  onCancel: () => void
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
    formState: { errors, isDirty },
  } = useForm<AccessPolicyFormValues>({
    resolver: yupResolver(accessPolicySchema),
    defaultValues: {
      policyName: start?.policyName ?? '',
      policyDescription: start?.policyDescription ?? '',
      enforceTotp2fa: start?.enforceTotp2fa ?? false,
      enforceEmail2fa: start?.enforceEmail2fa ?? false,
      // the API's default for new policies
      allowDeviceLogins: start?.allowDeviceLogins ?? true,
      hasIpRestriction: start?.hasIpRestriction ?? false,
      allowedIps: start?.allowedIps.map((value) => ({ value: normalizeCidr(value) })) ?? [],
      hasGeoRestriction: start?.hasGeoRestriction ?? false,
      allowedGeoLocations: start?.allowedGeoLocations.map((c) => c.toUpperCase()) ?? [],
    },
  })
  const hasIpRestriction = useWatch({ control, name: 'hasIpRestriction' })
  const [ipDraft, setIpDraft] = useState<IpDraft>({ text: '', error: null })
  const hasGeoRestriction = useWatch({ control, name: 'hasGeoRestriction' })

  const onSubmit = (v: AccessPolicyFormValues) => {
    // an address typed but never added would be silently left out
    if (v.hasIpRestriction && ipDraft.text.trim()) {
      setIpDraft({ ...ipDraft, error: { message: 'Press + to add this to the list, or clear it.' } })
      return
    }
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
      allowDeviceLogins: v.allowDeviceLogins,
      hasIpRestriction: v.hasIpRestriction,
      allowedIps: [
        ...new Set(
          v.allowedIps
            .map((r) => r.value.trim())
            .filter(Boolean)
            .map(normalizeCidr),
        ),
      ],
      hasGeoRestriction: v.hasGeoRestriction,
      allowedGeoLocations: v.allowedGeoLocations,
    })
      .then(() => {
        toast.success(policy ? `Saved ${v.policyName}.` : `Created ${v.policyName}.`)
        setTimeout(() => onSaved(v.policyName), 500)
      })
      .catch((error: Error) => toast.error(error.message))
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-6">
          <Card title="Details" hint="How the policy shows up in lists and when assigning it.">
            <FormField id="policyName" required label="Name" error={errors.policyName?.message}>
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
              <Textarea
                id="policyDescription"
                rows={3}
                placeholder="Who this policy is for, e.g. contractors working from the office"
                hasError={!!errors.policyDescription}
                {...register('policyDescription')}
              />
            </FormField>
          </Card>

          <Card title="Two-factor sign-in" hint="Second factors everyone with this policy must set up before using N-Ops.">
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
          </Card>

          <Card title="Mobile app" hint="Signing in on a phone with the N-Ops app, which keeps the device signed in.">
            <Switch
              label="Allow the mobile app"
              description="Users with this policy can link a phone from Account › Devices."
              {...register('allowDeviceLogins')}
            />
          </Card>
        </div>

        <Card title="Where they can sign in from" hint="Leave both off to allow sign-in from anywhere.">
          <Switch
            label="Restrict by IP address"
            description="Only allow sign-in from the addresses below."
            {...register('hasIpRestriction')}
          />
          {hasIpRestriction && <IpListField control={control} errors={errors} draft={ipDraft} onDraft={setIpDraft} />}
          <div className="border-t border-border" />
          <Switch
            label="Restrict by country"
            description="Only allow sign-in from the countries below."
            {...register('hasGeoRestriction')}
          />
          {hasGeoRestriction && (
            <FormField id="allowedGeoLocations" required label="Allowed countries" error={errors.allowedGeoLocations?.message}>
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
        </Card>

        <PolicySummary control={control} />
      </div>

      {/* floats at the bottom of the window while the form scrolls, and sits under the cards when it fits */}
      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-raised px-5 py-3 shadow-lg">
        <p className="text-sm text-text-muted" aria-live="polite">
          {isDirty ? (
            <span className="inline-flex items-center gap-2">
              <span className="size-2 rounded-full bg-warning" aria-hidden="true" />
              Unsaved changes
            </span>
          ) : policy ? (
            'No changes yet'
          ) : (
            'Only a name is required. Everything else is optional.'
          )}
        </p>
        <div className="flex items-center gap-2">
          <LoadingButton variant="ghost" onClick={onCancel}>
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
      </div>
    </form>
  )
}

/**
 * Creates a policy (optionally from `template`), or edits `policy`, starting from its latest saved
 * state so the save only sends what changed (falls back to the given copy if that can't load).
 */
export const AccessPolicyForm = ({
  policy,
  template,
  onSaved,
  onCancel,
}: {
  /** The policy being edited; omit to create one. */
  policy?: AccessPolicy
  /** Pre-fills a new policy (Duplicate). */
  template?: AccessPolicy
  onSaved: (name: string) => void
  onCancel: () => void
}) => {
  const { data: latest, isPending } = useAccessPolicy(policy?.policyId ?? null)
  if (policy && isPending)
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading policy">
        <Skeleton height={40} />
        <Skeleton height={160} />
      </div>
    )
  return <PolicyForm policy={policy ? (latest ?? policy) : undefined} template={template} onSaved={onSaved} onCancel={onCancel} />
}
