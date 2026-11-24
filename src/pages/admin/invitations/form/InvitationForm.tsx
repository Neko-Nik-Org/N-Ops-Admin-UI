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
/** Send-invitation form for Admin › Invitations (`POST /invite/new`). */

import { yupResolver } from '@hookform/resolvers/yup'
import { MailPlus } from 'lucide-react'
import { useForm, useWatch, type Control } from 'react-hook-form'
import { toast } from 'react-toastify'
import { Badge } from '@/components/Badge'
import { Input } from '@/components/Input'
import { Select } from '@/components/Select'
import { Textarea } from '@/components/Textarea'
import { FormCard, FormFooter } from '@/components/FormCard'
import { FormField } from '@/components/FormField'
import { useAccessPolicies } from '@/hooks/useAccessPolicies'
import { useAdminUsers } from '@/hooks/useUsers'
import { useInvitations, useSendInvitation } from '@/hooks/useInvitations'
import { useRoleOptions } from '@/hooks/useRoles'
import {
  INVITATION_EXPIRY_HOURS,
  invitationExpiry,
  invitationSchema,
  type InvitationFormValues,
} from '@/pages/admin/invitations/form/invitationValidation'
import { useHasPermissions } from '@/hooks/usePermissions'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { formatDateTime } from '@/utils/format'
import type { AccessPolicy } from '@/types/accessPolicy'
import type { Role } from '@/types/role'

/** "1 hour", "3 days". */
const expiryLabel = (hours: number) =>
  hours < 24 ? `${hours} hour${hours === 1 ? '' : 's'}` : `${hours / 24} day${hours === 24 ? '' : 's'}`

/** What the invitation will do, updated as the form changes. */
const InvitationSummary = ({
  control,
  roles,
  policies,
}: {
  control: Control<InvitationFormValues>
  roles: readonly Role[]
  policies: readonly AccessPolicy[]
}) => {
  const [email, roleId, policyId, hours, note] = useWatch({
    control,
    name: ['email', 'roleId', 'accessPolicyId', 'expiresInHours', 'invitationNotes'],
  })
  const role = roles.find((r) => r.roleId === Number(roleId))
  const policy = policies.find((p) => p.policyId === Number(policyId))
  const rules = policy
    ? [
        policy.enforceTotp2fa && 'Authenticator app',
        policy.enforceEmail2fa && 'Email code',
        policy.hasIpRestriction && 'IP limits',
        policy.hasGeoRestriction && 'Country limits',
      ].filter((x): x is string => !!x)
    : []

  return (
    <aside className="flex flex-col gap-4 rounded-xl border border-border bg-surface-raised p-5 xl:sticky xl:top-20">
      <div className="flex items-center gap-2 text-sm font-semibold text-text">
        <MailPlus size={16} aria-hidden="true" className="text-signal" />
        Summary
      </div>
      <p className="text-sm text-text-muted">
        <span className="font-medium break-all text-text">{email?.trim() || 'The person you invite'}</span> gets an email with a
        link to join as <span className="font-medium text-text">{role ? role.roleName : 'the role you pick'}</span>. The link
        works for {expiryLabel(Number(hours))}.
      </p>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 border-t border-border pt-4 text-sm">
        <dt className="text-text-muted">Role</dt>
        <dd className="min-w-0 text-text">
          {role ? (
            <>
              {role.roleName}
              <span className="block text-xs text-text-muted">
                {role.permissions.length} permission{role.permissions.length === 1 ? '' : 's'}
                {role.tagIds.length ? ` · ${role.tagIds.length} tag${role.tagIds.length === 1 ? '' : 's'}` : ' · all tags'}
              </span>
            </>
          ) : (
            <span className="text-text-muted">Not picked yet</span>
          )}
        </dd>
        <dt className="text-text-muted">Policy</dt>
        <dd className="flex min-w-0 flex-wrap gap-1">
          {policy ? (
            <>
              <span className="w-full text-text">{policy.policyName}</span>
              {rules.length ? (
                rules.map((r) => (
                  <Badge key={r} tone="signal">
                    {r}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-text-muted">No rules</span>
              )}
            </>
          ) : (
            <span className="text-text-muted">None</span>
          )}
        </dd>
        <dt className="text-text-muted">Expires</dt>
        <dd className="text-text">{formatDateTime(invitationExpiry(Number(hours)).toISOString())}</dd>
        <dt className="text-text-muted">Note</dt>
        <dd className="min-w-0 break-words whitespace-pre-line text-text">
          {note?.trim() || <span className="text-text-muted">None</span>}
        </dd>
      </dl>
    </aside>
  )
}

/** Emails someone an invitation to join the organization with the role (and policy) picked here. */
export const InvitationForm = ({ onSent, onCancel }: { onSent: () => void; onCancel: () => void }) => {
  const { roles, canView: canViewRoles } = useRoleOptions()
  const canViewPolicies = useHasPermissions('policy:ar:view')
  const canViewInvitations = useHasPermissions('user:invite:view')
  const { data: policies = [] } = useAccessPolicies({ enabled: canViewPolicies })
  // both only for catching duplicates early; the API refuses them anyway
  const { data: invitations = [] } = useInvitations({ enabled: canViewInvitations })
  const { data: users = [] } = useAdminUsers()
  const { mutateAsync: send } = useSendInvitation()
  const [state, save] = useAsyncAction(send, { successMs: 500 })

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isDirty },
  } = useForm<InvitationFormValues>({
    resolver: yupResolver(invitationSchema),
    defaultValues: { email: '', roleId: 0, accessPolicyId: 0, expiresInHours: 168, invitationNotes: '' },
  })
  const expiresInHours = Number(useWatch({ control, name: 'expiresInHours' }))

  const onSubmit = (v: InvitationFormValues) => {
    const email = v.email.toLowerCase()
    if (invitations.some((i) => i.email.toLowerCase() === email)) {
      setError('email', { message: 'This email already has an invitation. Revoke it first to send a new one.' })
      return
    }
    if (users.some((u) => u.primaryEmail.toLowerCase() === email)) {
      setError('email', { message: 'Someone in your organization already uses this email.' })
      return
    }
    return save({
      email,
      invitationNotes: v.invitationNotes,
      roleId: Number(v.roleId),
      accessPolicyId: Number(v.accessPolicyId) || null,
      expiresAt: invitationExpiry(Number(v.expiresInHours)),
    })
      .then(() => {
        toast.success(`Invitation sent to ${email}.`)
        setTimeout(onSent, 500)
      })
      .catch((error: Error) => toast.error(error.message))
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_20rem]">
        <FormCard
          title="Who and what"
          hint="They get an email with a link to join your organization. The link works until it expires."
        >
          <FormField id="inviteEmail" label="Email" error={errors.email?.message}>
            <Input
              id="inviteEmail"
              type="email"
              placeholder="priya@company.com"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              hasError={!!errors.email}
              {...register('email')}
            />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField id="inviteRoleId" label="Role" error={errors.roleId?.message}>
              <Select id="inviteRoleId" hasError={!!errors.roleId} {...register('roleId')}>
                <option value={0} disabled>
                  Pick a role
                </option>
                {roles.map((r) => (
                  <option key={r.roleId} value={r.roleId}>
                    {r.roleName}
                  </option>
                ))}
              </Select>
              {!roles.length && (
                <p className="text-xs text-text-muted">
                  {canViewRoles
                    ? 'There are no roles yet. Create one on the Roles page.'
                    : 'You need the “View roles” permission (user:role:view) to pick a role.'}
                </p>
              )}
            </FormField>
            <FormField id="inviteAccessPolicyId" label="Access policy" error={errors.accessPolicyId?.message}>
              <Select id="inviteAccessPolicyId" disabled={!canViewPolicies} {...register('accessPolicyId')}>
                <option value={0}>No access policy</option>
                {policies.map((p) => (
                  <option key={p.policyId} value={p.policyId}>
                    {p.policyName}
                  </option>
                ))}
              </Select>
              {!canViewPolicies && (
                <p className="text-xs text-text-muted">
                  You need the “View access policies” permission (policy:ar:view) to pick a policy.
                </p>
              )}
            </FormField>
          </div>
        </FormCard>
        <FormCard title="Invitation">
          <FormField id="inviteExpiresIn" label="Expires after" error={errors.expiresInHours?.message}>
            <Select id="inviteExpiresIn" {...register('expiresInHours')}>
              {INVITATION_EXPIRY_HOURS.map((h) => (
                <option key={h} value={h}>
                  {expiryLabel(h)}
                </option>
              ))}
            </Select>
            <p className="text-xs text-text-muted">
              The link stops working on {formatDateTime(invitationExpiry(expiresInHours).toISOString())}.
            </p>
          </FormField>
          <FormField id="inviteNotes" label="Note (optional)" error={errors.invitationNotes?.message}>
            <Textarea
              id="inviteNotes"
              rows={3}
              maxLength={1000}
              placeholder="Shown in the invitation email"
              hasError={!!errors.invitationNotes}
              {...register('invitationNotes')}
            />
          </FormField>
        </FormCard>

        <InvitationSummary control={control} roles={roles} policies={policies} />
      </div>

      <FormFooter
        state={state}
        dirty={isDirty}
        editing={false}
        idleNote="An email and a role are required."
        submitLabel="Send invitation"
        loadingText="Sending"
        successText="Sent"
        onCancel={onCancel}
      />
    </form>
  )
}
