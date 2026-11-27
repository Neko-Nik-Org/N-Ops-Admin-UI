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
 * Super-admin dialogs for organizations: invite an admin and delete. Creating and editing an
 * organization have their own pages (./form).
 */

import { yupResolver } from '@hookform/resolvers/yup'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import * as yup from 'yup'
import { Dialog } from '@/components/Dialog'
import { FormField } from '@/components/FormField'
import { Input } from '@/components/Input'
import { LoadingButton } from '@/components/LoadingButton'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { useDeleteOrganization, useInviteOrganizationAdmin } from '@/hooks/useOrganizations'
import type { Organization } from '@/types/organization'

const Buttons = ({
  onClose,
  state,
  label,
}: {
  onClose: () => void
  state: ReturnType<typeof useAsyncAction>[0]
  label: string
}) => (
  <div className="flex justify-end gap-2 pt-1">
    <LoadingButton variant="ghost" onClick={onClose}>
      Cancel
    </LoadingButton>
    <LoadingButton type="submit" state={state} loadingText="Saving" successText="Done">
      {label}
    </LoadingButton>
  </div>
)

// ── invite an admin ──────────────────────────────────────

const InviteAdminForm = ({ org, onClose }: { org: Organization; onClose: () => void }) => {
  const { mutateAsync: invite } = useInviteOrganizationAdmin()
  const [state, send] = useAsyncAction(invite, { successMs: 500 })
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ email: string }>({
    resolver: yupResolver(
      yup.object({
        email: yup
          .string()
          .trim()
          .required('Enter their email.')
          .email('Enter a valid email address.')
          .max(254, 'Keep it to 254 characters or fewer.'),
      }),
    ),
    defaultValues: { email: '' },
  })

  const onSubmit = ({ email }: { email: string }) =>
    send({ organizationId: org.organizationId, email })
      .then(() => {
        toast.success(`Invitation sent to ${email.toLowerCase()}.`)
        setTimeout(onClose, 500)
      })
      .catch((error: Error) => toast.error(error.message))

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <FormField id="orgAdminEmail" required label="Email" error={errors.email?.message}>
        <Input
          id="orgAdminEmail"
          type="email"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="admin@company.com"
          hasError={!!errors.email}
          {...register('email')}
        />
      </FormField>
      <p className="-mt-2 text-xs text-text-muted">
        They get every permission, through a role named “Super Admin - Initial Automated Invite”. The link works for 7 days.
      </p>
      <Buttons onClose={onClose} state={state} label="Send invitation" />
    </form>
  )
}

export const InviteAdminDialog = ({ org, onClose }: { org: Organization | null; onClose: () => void }) => (
  <Dialog open={!!org} onClose={onClose} title={org ? `Invite an admin to ${org.organizationName}` : ''}>
    {org && <InviteAdminForm org={org} onClose={onClose} />}
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
      <FormField id="orgDeleteConfirm" required label={`Type ${org.organizationName} to confirm`}>
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
