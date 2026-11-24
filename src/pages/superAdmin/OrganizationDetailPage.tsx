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
 * Super admin › one organization (/super-admin/organizations/:organizationId), fresh from the API:
 * usage, plan limits, profile and billing details, with rename, enable / disable and delete.
 */

import { ArrowLeft, Ban, CheckCircle2, Pencil, Send, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge } from '@/components/atoms/Badge'
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog'
import { CopyButton } from '@/components/molecules/CopyButton'
import { LoadingButton } from '@/components/molecules/LoadingButton'
import { Meter } from '@/components/molecules/Meter'
import { PageHeader } from '@/components/molecules/PageHeader'
import { SkeletonText } from '@/components/molecules/Skeleton'
import { ROUTES } from '@/constants/routes'
import { describeOrgProfile } from '@/features/account/orgProfile'
import { useOrganization, useSetOrganizationActive } from '@/features/superAdmin/hooks/useOrganizations'
import { formatBytes, formatDateTime, formatNumber } from '@/utils/format'
import {
  DeleteOrganizationDialog,
  DetailsDialog,
  InviteAdminDialog,
  LimitsDialog,
  RenameOrganizationDialog,
} from './OrganizationDialogs'

const Card = ({ title, onEdit, children }: { title: string; onEdit?: () => void; children: ReactNode }) => (
  <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface-raised p-5">
    <div className="flex items-center justify-between gap-2">
      <h2 className="font-semibold text-text">{title}</h2>
      {onEdit && (
        <LoadingButton
          variant="ghost"
          size="sm"
          icon={<Pencil size={13} />}
          aria-label={`Edit ${title.toLowerCase()}`}
          onClick={onEdit}
        >
          Edit
        </LoadingButton>
      )}
    </div>
    {children}
  </section>
)

/** Label / value pairs from a details object: the profile's fields in order, then anything else. */
const DetailsList = ({ details, empty }: { details: Record<string, unknown>; empty: string }) => {
  const entries = describeOrgProfile(details)
  return entries.length ? (
    <dl className="flex flex-col gap-3">
      {entries.map(({ key, label, value }) => (
        <div key={key} className="flex flex-col gap-0.5">
          <dt className="text-sm text-text-muted">{label}</dt>
          <dd className="text-sm break-words whitespace-pre-line text-text">{value}</dd>
        </div>
      ))}
    </dl>
  ) : (
    <p className="text-sm text-text-muted">{empty}</p>
  )
}

const Limit = ({ label, value }: { label: string; value: number }) => (
  <div className="flex items-baseline justify-between gap-2 border-t border-border py-2 text-sm first:border-t-0 first:pt-0">
    <dt className="text-text-muted">{label}</dt>
    <dd className="font-medium text-text">{formatNumber(value)}</dd>
  </div>
)

export const OrganizationDetailPage = () => {
  const { organizationId = '' } = useParams()
  const { data: org, isLoading, error } = useOrganization(organizationId)
  const [dialog, setDialog] = useState<'rename' | 'invite' | 'state' | 'limits' | 'profile' | 'billing' | 'delete' | null>(null)
  const close = () => setDialog(null)
  const { mutateAsync: setActive } = useSetOrganizationActive()
  const navigate = useNavigate()

  const back = (
    <Link to={ROUTES.superAdmin} className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text">
      <ArrowLeft size={14} aria-hidden="true" /> All organizations
    </Link>
  )

  if (isLoading)
    return (
      <>
        {back}
        <SkeletonText lines={8} />
      </>
    )
  if (error || !org)
    return (
      <>
        {back}
        <p className="text-sm text-text-muted">{error?.message ?? "Couldn't load this organization."}</p>
      </>
    )

  return (
    <>
      {back}
      <PageHeader
        title={org.organizationName}
        badge={<Badge tone={org.isActive ? 'signal' : 'neutral'}>{org.isActive ? 'Active' : 'Disabled'}</Badge>}
        actions={
          <>
            <LoadingButton variant="secondary" size="sm" icon={<Send size={14} />} onClick={() => setDialog('invite')}>
              Invite admin
            </LoadingButton>
            <LoadingButton variant="secondary" size="sm" icon={<Pencil size={14} />} onClick={() => setDialog('rename')}>
              Rename
            </LoadingButton>
            <LoadingButton
              variant="secondary"
              size="sm"
              icon={org.isActive ? <Ban size={14} /> : <CheckCircle2 size={14} />}
              onClick={() => setDialog('state')}
            >
              {org.isActive ? 'Disable' : 'Enable'}
            </LoadingButton>
            <LoadingButton variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => setDialog('delete')}>
              Delete
            </LoadingButton>
          </>
        }
      />
      <p className="-mt-4 flex items-center gap-2 font-mono text-xs text-text-muted">
        {org.organizationId} <CopyButton text={org.organizationId} label="Copy organization id" />
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <Card title="Usage">
          <Meter label="Storage" used={org.storageBytes.used} total={org.storageBytes.allocated} format={formatBytes} />
          <Meter label="AI credit" used={org.aiCredit.used} total={org.aiCredit.allocated} />
          <p className="text-xs text-text-muted">Created {formatDateTime(org.createdAt)}</p>
        </Card>
        <Card title="Plan limits" onEdit={() => setDialog('limits')}>
          <dl>
            <Limit label="Users" value={org.userLimit} />
            <Limit label="Servers" value={org.serverLimit} />
            <Limit label="Workflows" value={org.workflowLimit} />
            <Limit label="Vault projects" value={org.vaultProjectLimit} />
            <Limit label="Vault keys per project" value={org.vaultKeysPerProjectLimit} />
            <Limit label="Vault notes" value={org.vaultNotesLimit} />
          </dl>
        </Card>
        <Card title="Profile" onEdit={() => setDialog('profile')}>
          <DetailsList details={org.organizationInfo} empty="No profile details saved." />
        </Card>
        <Card title="Billing" onEdit={() => setDialog('billing')}>
          <DetailsList details={org.billingInfo} empty="No billing details saved." />
        </Card>
      </div>

      <RenameOrganizationDialog org={dialog === 'rename' ? org : null} onClose={close} />
      <InviteAdminDialog org={dialog === 'invite' ? org : null} onClose={close} />
      <LimitsDialog org={dialog === 'limits' ? org : null} onClose={close} />
      <DetailsDialog
        org={dialog === 'profile' || dialog === 'billing' ? org : null}
        which={dialog === 'billing' ? 'billing' : 'profile'}
        onClose={close}
      />
      <ConfirmDialog
        open={dialog === 'state'}
        title={org.isActive ? 'Disable organization' : 'Enable organization'}
        confirmLabel={org.isActive ? 'Disable' : 'Enable'}
        successMessage={org.isActive ? `Disabled ${org.organizationName}.` : `Enabled ${org.organizationName}.`}
        onConfirm={() => setActive({ organizationId: org.organizationId, isActive: !org.isActive })}
        onClose={close}
      >
        <p>
          {org.isActive
            ? `Nobody in ${org.organizationName} will be able to sign in until it's enabled again. Its data is kept.`
            : `People in ${org.organizationName} will be able to sign in again.`}
        </p>
      </ConfirmDialog>
      <DeleteOrganizationDialog
        org={dialog === 'delete' ? org : null}
        onClose={close}
        onDeleted={() => navigate(ROUTES.superAdmin, { replace: true })}
      />
    </>
  )
}
