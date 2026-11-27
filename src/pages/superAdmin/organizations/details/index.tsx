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
 * usage, plan limits, profile and billing details, with invite, enable / disable and delete. Edit
 * (and each card's Edit) opens the edit page.
 */

import { Ban, CheckCircle2, Pencil, Send, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge } from '@/components/Badge'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { CopyButton } from '@/components/CopyButton'
import { LoadingButton } from '@/components/LoadingButton'
import { Meter } from '@/components/Meter'
import { PageToolbar, type Crumb } from '@/components/PageToolbar'
import { SkeletonText } from '@/components/Skeleton'
import { ROUTES, superAdminOrganizationEditPath } from '@/constants/routes'
import { describeOrgProfile } from '@/utils/orgProfile'
import { useOrganization, useSetOrganizationActive } from '@/hooks/useOrganizations'
import { formatBytes, formatDateTime, formatNumber } from '@/utils/format'
import { DeleteOrganizationDialog, InviteAdminDialog } from '@/pages/superAdmin/organizations/OrganizationDialogs'

/** "Organizations › <current>". */
const crumbs = (current: string): Crumb[] => [{ label: 'Organizations', to: ROUTES.superAdmin }, { label: current }]

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
  const [dialog, setDialog] = useState<'invite' | 'state' | 'delete' | null>(null)
  const close = () => setDialog(null)
  const { mutateAsync: setActive } = useSetOrganizationActive()
  const navigate = useNavigate()
  const edit = (section?: Parameters<typeof superAdminOrganizationEditPath>[1]) =>
    navigate(superAdminOrganizationEditPath(organizationId, section))

  if (isLoading)
    return (
      <div className="flex flex-col gap-6">
        <PageToolbar crumbs={crumbs('Organization')} back={ROUTES.superAdmin} />
        <SkeletonText lines={8} />
      </div>
    )
  if (error || !org)
    return (
      <div className="flex flex-col gap-6">
        <PageToolbar crumbs={crumbs('Not found')} back={ROUTES.superAdmin} />
        <p className="text-sm text-text-muted">{error?.message ?? "Couldn't load this organization."}</p>
      </div>
    )

  return (
    <>
      <div className="flex flex-col gap-3">
        <PageToolbar
          crumbs={crumbs(org.organizationName)}
          back={ROUTES.superAdmin}
          actions={
            <>
              <LoadingButton variant="secondary" size="sm" icon={<Send size={14} />} onClick={() => setDialog('invite')}>
                Invite admin
              </LoadingButton>
              <LoadingButton
                variant="secondary"
                size="sm"
                icon={org.isActive ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                onClick={() => setDialog('state')}
              >
                {org.isActive ? 'Disable' : 'Enable'}
              </LoadingButton>
              <LoadingButton variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => setDialog('delete')}>
                Delete
              </LoadingButton>
              <LoadingButton size="sm" icon={<Pencil size={14} />} onClick={() => edit()}>
                Edit
              </LoadingButton>
            </>
          }
        />
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-bold text-text">{org.organizationName}</h1>
            <Badge tone={org.isActive ? 'signal' : 'neutral'}>{org.isActive ? 'Active' : 'Disabled'}</Badge>
          </div>
          <p className="flex items-center gap-2 font-mono text-xs text-text-muted">
            {org.organizationId} <CopyButton text={org.organizationId} label="Copy organization id" />
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <Card title="Usage">
          <Meter label="Storage" used={org.storageBytes.used} total={org.storageBytes.allocated} format={formatBytes} />
          <Meter label="AI credit" used={org.aiCredit.used} total={org.aiCredit.allocated} />
          <p className="text-xs text-text-muted">Created {formatDateTime(org.createdAt)}</p>
        </Card>
        <Card title="Plan limits" onEdit={() => edit('limits')}>
          <dl>
            <Limit label="Users" value={org.userLimit} />
            <Limit label="Servers" value={org.serverLimit} />
            <Limit label="Workflows" value={org.workflowLimit} />
            <Limit label="Vault projects" value={org.vaultProjectLimit} />
            <Limit label="Vault keys per project" value={org.vaultKeysPerProjectLimit} />
            <Limit label="Vault notes" value={org.vaultNotesLimit} />
          </dl>
        </Card>
        <Card title="Profile" onEdit={() => edit('profile')}>
          <DetailsList details={org.organizationInfo} empty="No profile details saved." />
        </Card>
        <Card title="Billing" onEdit={() => edit('billing')}>
          <DetailsList details={org.billingInfo} empty="No billing details saved." />
        </Card>
      </div>

      <InviteAdminDialog org={dialog === 'invite' ? org : null} onClose={close} />
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
