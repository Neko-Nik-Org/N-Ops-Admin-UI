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
 * Super admin › Organizations › new or edit (/super-admin/organizations/new and
 * /super-admin/organizations/:organizationId/edit): the organization forms as their own pages.
 * A link can open the edit page at one section, e.g. `…/edit#limits`.
 */

import { useEffect } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { PageToolbar } from '@/components/PageToolbar'
import { SkeletonText } from '@/components/Skeleton'
import { ROUTES, superAdminOrganizationPath } from '@/constants/routes'
import { useGoBack } from '@/hooks/useGoBack'
import { useOrganization } from '@/hooks/useOrganizations'
import { errorStatus } from '@/types/api'
import { OrganizationCreateForm } from './OrganizationCreateForm'
import { OrganizationEditForm } from './OrganizationEditForm'

/** Scrolls to the section named in the URL's #hash once the form is there. */
const useScrollToSection = (ready: boolean) => {
  const { hash } = useLocation()
  useEffect(() => {
    if (!ready || !hash) return
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView?.({ block: 'start' })
  }, [ready, hash])
}

export const OrganizationFormPage = () => {
  const { organizationId } = useParams()
  const editing = organizationId !== undefined
  const { data: org, isLoading, error } = useOrganization(organizationId ?? '', editing)
  const navigate = useNavigate()
  // where Back and Cancel lead when the page was opened directly; otherwise they return to the previous page
  const fallback = editing ? superAdminOrganizationPath(organizationId) : ROUTES.superAdmin
  const back = useGoBack(fallback)
  useScrollToSection(!!org)

  const title = editing ? (org ? `Edit ${org.organizationName}` : 'Edit organization') : 'New organization'
  const crumbs = [
    { label: 'Organizations', to: ROUTES.superAdmin },
    ...(editing && org ? [{ label: org.organizationName, to: fallback }] : []),
    { label: editing ? 'Edit' : 'New organization' },
  ]
  const header = (
    <div className="flex flex-col gap-1">
      <PageToolbar crumbs={crumbs} back={fallback} />
      {/* the path above names the page; the heading is for screen readers */}
      <PageHeader title={title} />
    </div>
  )

  if (editing && isLoading) return <SkeletonText lines={8} />
  if (editing && (error || !org))
    return (
      <div className="flex flex-col gap-6">
        {header}
        <p className="text-sm text-text-muted">
          {errorStatus(error) === 404 || !error
            ? "There's no organization here. It may have been deleted."
            : `Couldn't load this organization: ${error.message}`}
        </p>
      </div>
    )

  return (
    <div className="flex flex-col gap-6">
      {header}
      {org ? (
        <OrganizationEditForm key={org.organizationId} org={org} onSaved={back} onCancel={back} />
      ) : (
        // the API returns no id, so the list opens filtered to the new organization's name
        <OrganizationCreateForm
          onCreated={(name) => navigate(`${ROUTES.superAdmin}?search=${encodeURIComponent(name)}`)}
          onCancel={back}
        />
      )}
    </div>
  )
}
