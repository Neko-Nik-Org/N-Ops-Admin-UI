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
 * Vault (/vault, /vault/:projectId, /vault/:projectId/:section): projects are folders, each
 * holding three folders:
 * - Env: deployment credentials and application secrets;
 * - Conf: deployable configuration files;
 * - Notes: human-readable sensitive information, docs, recovery instructions and procedures.
 * The open folder is laid out like the app's other pages.
 */

import type { ReactNode } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { SkeletonText } from '@/components/Skeleton'
import { useVaultProjects } from '@/hooks/useVault'
import { errorStatus } from '@/types/api'
import { ProjectView, RootView } from '@/pages/vault/explorer/FolderViews'
import { ConfView, EnvView, NotesView } from '@/pages/vault/explorer/ItemViews'
import { isSection, vaultPath } from '@/pages/vault/explorer/sections'

/** The open Vault folder. */
export const VaultPage = () => {
  const params = useParams<{ projectId?: string; section?: string }>()
  const { data: projects, isLoading, error } = useVaultProjects()

  const projectId = params.projectId !== undefined && /^\d+$/.test(params.projectId) ? Number(params.projectId) : null
  const project = projects?.find((p) => p.projectId === projectId) ?? null
  const section = isSection(params.section) ? params.section : null
  const badPath =
    (params.projectId !== undefined && (projectId === null || (!!projects && !project))) ||
    (params.section !== undefined && !section)
  // one view per folder, so its search and dialogs start fresh when you move
  const key = `${params.projectId ?? ''}/${params.section ?? ''}`

  let content: ReactNode
  if (isLoading)
    content = (
      <div className="flex flex-col gap-6">
        <PageHeader title="Vault" />
        <SkeletonText lines={8} />
      </div>
    )
  else if (error)
    content = (
      <div className="flex flex-col gap-6">
        <PageHeader title="Vault" />
        <p className="text-sm text-text-muted">
          {errorStatus(error) === 403
            ? 'You need the “View vault projects” permission (vault:project:view) to open the Vault.'
            : `Couldn't load the Vault: ${error.message}`}
        </p>
      </div>
    )
  else if (badPath)
    content = (
      <div className="flex flex-col gap-6">
        <PageHeader title="Vault" />
        <div className="rounded-xl border border-border bg-surface-raised p-10 text-center">
          <p className="text-sm text-text">This folder doesn't exist. It may have been deleted or renamed.</p>
          <Link to={vaultPath()} className="mt-2 inline-block text-sm text-signal hover:text-signal-strong">
            Go to Vault
          </Link>
        </div>
      </div>
    )
  // a project opens on its first tab
  else if (project && !section) content = <Navigate to={vaultPath(project.projectId, 'env')} replace />
  else if (project && section)
    content = (
      <ProjectView key={project.projectId} project={project} section={section}>
        {section === 'env' && <EnvView key={key} project={project} />}
        {section === 'conf' && <ConfView key={key} project={project} />}
        {section === 'notes' && <NotesView key={key} project={project} />}
      </ProjectView>
    )
  else content = <RootView key={key} projects={projects ?? []} />

  return <div className="min-w-0">{content}</div>
}
