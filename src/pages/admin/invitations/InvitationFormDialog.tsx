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
/** Send-invitation dialog for Admin › Invitations (`POST /invite/new`). */

import { yupResolver } from '@hookform/resolvers/yup'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'react-toastify'
import { Input } from '@/components/Input'
import { Select } from '@/components/Select'
import { Textarea } from '@/components/Textarea'
import { Dialog } from '@/components/Dialog'
import { FormField } from '@/components/FormField'
import { LoadingButton } from '@/components/LoadingButton'
import { useAccessPolicies } from '@/hooks/useAccessPolicies'
import { useAdminUsers } from '@/hooks/useUsers'
import { useInvitations, useSendInvitation } from '@/hooks/useInvitations'
import { useRoleOptions } from '@/hooks/useRoles'
import {
  INVITATION_EXPIRY_HOURS,
  invitationExpiry,
  invitationSchema,
  type InvitationFormValues,
} from '@/pages/admin/invitations/invitationValidation'
import { useHasPermissions } from '@/hooks/usePermissions'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { formatDateTime } from '@/utils/format'

/** "1 hour", "3 days". */
const expiryLabel = (hours: number) =>
  hours < 24 ? `${hours} hour${hours === 1 ? '' : 's'}` : `${hours / 24} day${hours === 24 ? '' : 's'}`

const InvitationForm = ({ onClose }: { onClose: () => void }) => {
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
    formState: { errors },
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
        setTimeout(onClose, 500)
      })
      .catch((error: Error) => toast.error(error.message))
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
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

      <div className="flex justify-end gap-2 pt-1">
        <LoadingButton variant="ghost" onClick={onClose}>
          Cancel
        </LoadingButton>
        <LoadingButton type="submit" state={state} loadingText="Sending" successText="Sent">
          Send invitation
        </LoadingButton>
      </div>
    </form>
  )
}

/** Emails someone an invitation to join the organization with the role (and policy) picked here. */
export const InvitationFormDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => (
  <Dialog
    open={open}
    onClose={onClose}
    size="lg"
    title="Invite someone"
    description="They get an email with a link to join your organization. The link works until it expires."
  >
    {open && <InvitationForm onClose={onClose} />}
  </Dialog>
)
