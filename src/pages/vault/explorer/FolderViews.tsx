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
/** Folder views: the Vault root (project folders) and a project (its Env / Conf / Notes folders). */

import { Folder, FolderOpen, FolderPlus, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LoadingButton } from '@/components/molecules/LoadingButton'
import { DeleteProjectDialog, ProjectFormDialog } from '@/components/organisms/ProjectDialogs'
import { useOrgInfo } from '@/features/account/hooks/useAccount'
import { useHasPermissions } from '@/features/auth/permissions'
import type { VaultProject } from '@/features/vault/types'
import { formatDateTime, formatRelative } from '@/utils/format'
import { FolderContents, FolderHeader, FolderLayout, FolderPage, ListCard, PreviewCard, PreviewHint } from './ExplorerParts'
import { FolderGlyph } from './ExplorerIcons'
import { plural, SECTION_ORDER, SECTIONS, vaultPath, type VaultSection } from './sections'
import { useSectionCounts } from './useSectionCounts'
import { useSelectedItem } from './useSelectedItem'

const matches = (search: string, ...values: string[]) => {
  const q = search.trim().toLowerCase()
  return !q || values.some((v) => v.toLowerCase().includes(q))
}

const ROOT_CRUMB = { label: 'Vault', to: vaultPath() }

/** Who may create, rename and delete projects (the API's checks), the plan's quota, and the dialogs' state. */
const useProjectActions = () => {
  const canCreate = useHasPermissions('vault:project:view', 'vault:project:create')
  const canRename = useHasPermissions('vault:project:view', 'vault:project:edit')
  const canDelete = useHasPermissions('vault:project:view', 'vault:project:delete')
  const { data: org } = useOrgInfo()
  const atQuota = !!org && org.vaultProjects.current >= org.vaultProjects.limit
  const [creating, setCreating] = useState(false)
  const [renaming, setRenaming] = useState<VaultProject | null>(null)
  const [deleting, setDeleting] = useState<VaultProject | null>(null)
  return { canCreate, canRename, canDelete, atQuota, org, creating, setCreating, renaming, setRenaming, deleting, setDeleting }
}

// ── Vault root ───────────────────────────────────────────

/** A project's large icon: a paper peeks out when it holds anything you can see. */
const ProjectFolderIcon = ({ projectId }: { projectId: number }) => {
  const counts = useSectionCounts(projectId)
  return <FolderGlyph filled={!!(counts.env || counts.conf || counts.notes)} />
}

/**
 * A project in the preview card: what's inside (the same counts as the folder tree, so other
 * people's private notes aren't counted) and what you can do with it.
 */
const ProjectPreview = ({
  project,
  canRename,
  canDelete,
  onOpen,
  onRename,
  onDelete,
}: {
  project: VaultProject
  canRename: boolean
  canDelete: boolean
  onOpen: () => void
  onRename: () => void
  onDelete: () => void
}) => {
  const counts = useSectionCounts(project.projectId)
  const loaded = counts.env !== undefined && counts.conf !== undefined && counts.notes !== undefined
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Folder size={32} className="shrink-0 text-warning" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="truncate font-semibold text-text">{project.projectName}</h2>
          <p className="text-xs text-text-muted">Project folder</p>
        </div>
      </div>
      {project.description && <p className="text-sm text-text">{project.description}</p>}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-text-muted">Contains</dt>
        <dd className="text-text">
          {loaded ? `${plural(counts.env!, 'key')}, ${plural(counts.conf!, 'file')}, ${plural(counts.notes!, 'note')}` : '…'}
        </dd>
        <dt className="text-text-muted">Modified</dt>
        <dd className="text-text">{formatDateTime(project.updatedAt)}</dd>
        <dt className="text-text-muted">Created</dt>
        <dd className="text-text">{formatDateTime(project.createdAt)}</dd>
      </dl>
      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <LoadingButton size="sm" icon={<FolderOpen size={14} />} onClick={onOpen}>
          Open
        </LoadingButton>
        {canRename && (
          <LoadingButton variant="secondary" size="sm" icon={<Pencil size={14} />} onClick={onRename}>
            Rename
          </LoadingButton>
        )}
        {canDelete && (
          <LoadingButton variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={onDelete}>
            Delete
          </LoadingButton>
        )}
      </div>
    </div>
  )
}

/** The Vault root: one folder per project. */
export const RootView = ({ projects }: { projects: readonly VaultProject[] }) => {
  const navigate = useNavigate()
  const [selectedId, select] = useSelectedItem()
  const [search, setSearch] = useState('')
  const actions = useProjectActions()
  const visible = projects.filter((p) => matches(search, p.projectName, p.description))
  const selected = visible.find((p) => p.projectId === selectedId) ?? null
  const open = (p: VaultProject) => navigate(vaultPath(p.projectId))

  return (
    <FolderPage
      header={
        <FolderHeader
          path={[]}
          title="Vault"
          description="Projects are folders. Open one to find its Env secrets, Conf files and Notes."
          mock={false}
          actions={
            actions.canCreate && (
              <LoadingButton
                icon={<FolderPlus size={15} />}
                disabled={actions.atQuota}
                title={
                  actions.atQuota
                    ? `Your plan allows ${actions.org?.vaultProjects.limit} vault projects. Delete one or raise the limit first.`
                    : undefined
                }
                onClick={() => actions.setCreating(true)}
              >
                New project
              </LoadingButton>
            )
          }
        />
      }
    >
      <FolderLayout
        list={
          <ListCard title="Projects" count={visible.length} search={search} onSearch={setSearch}>
            <FolderContents
              label="Projects"
              rows={visible}
              rowId={(p) => p.projectId}
              name={(p) => p.projectName}
              text={(p) => p.projectName}
              bigIcon={(p) => <ProjectFolderIcon projectId={p.projectId} />}
              icon={() => <Folder size={16} className="text-warning" />}
              columns={[
                { key: 'description', label: 'Description', render: (p) => p.description || '—', className: 'max-w-72 truncate' },
                { key: 'modified', label: 'Modified', render: (p) => formatRelative(p.updatedAt) },
              ]}
              selectedId={selectedId}
              onSelect={select}
              onOpen={open}
              onDelete={(p) => actions.canDelete && actions.setDeleting(p)}
              empty={projects.length ? 'No projects match your search.' : 'The Vault is empty. Create a project to get started.'}
            />
          </ListCard>
        }
        preview={
          <PreviewCard>
            {selected ? (
              <ProjectPreview
                project={selected}
                canRename={actions.canRename}
                canDelete={actions.canDelete}
                onOpen={() => open(selected)}
                onRename={() => actions.setRenaming(selected)}
                onDelete={() => actions.setDeleting(selected)}
              />
            ) : (
              <PreviewHint>
                <span>Select a project to see what's inside.</span>
                <span className="text-xs">Double-click to open it.</span>
              </PreviewHint>
            )}
          </PreviewCard>
        }
      />
      <ProjectFormDialog open={actions.creating} onClose={() => actions.setCreating(false)} onCreated={(id) => select(id)} />
      <ProjectFormDialog
        open={!!actions.renaming}
        project={actions.renaming ?? undefined}
        onClose={() => actions.setRenaming(null)}
      />
      <DeleteProjectDialog project={actions.deleting} onClose={() => actions.setDeleting(null)} onDeleted={() => select(null)} />
    </FolderPage>
  )
}

// ── A project ────────────────────────────────────────────

/** Rows for the three folders; ids are just their position. */
const FOLDER_ROWS = SECTION_ORDER.map((section, i) => ({ id: i + 1, section }))

/** Inside a project: its Env, Conf and Notes folders. */
export const ProjectView = ({ project }: { project: VaultProject }) => {
  const navigate = useNavigate()
  const [selectedId, select] = useSelectedItem()
  const [search, setSearch] = useState('')
  const counts = useSectionCounts(project.projectId)
  const actions = useProjectActions()
  const visible = FOLDER_ROWS.filter((r) => matches(search, SECTIONS[r.section].label, SECTIONS[r.section].purpose))
  const selected = visible.find((r) => r.id === selectedId) ?? null
  const open = (section: VaultSection) => navigate(vaultPath(project.projectId, section))
  const countText = (s: VaultSection) => (counts[s] === undefined ? '…' : plural(counts[s]!, SECTIONS[s].noun))

  return (
    <FolderPage
      header={
        <FolderHeader
          path={[ROOT_CRUMB]}
          title={project.projectName}
          description={project.description || 'Project folder.'}
          actions={
            <>
              {actions.canRename && (
                <LoadingButton variant="secondary" icon={<Pencil size={14} />} onClick={() => actions.setRenaming(project)}>
                  Rename
                </LoadingButton>
              )}
              {actions.canDelete && (
                <LoadingButton variant="ghost" icon={<Trash2 size={14} />} onClick={() => actions.setDeleting(project)}>
                  Delete project
                </LoadingButton>
              )}
            </>
          }
        />
      }
    >
      <FolderLayout
        list={
          <ListCard title="Folders" count={visible.length} search={search} onSearch={setSearch}>
            <FolderContents
              label={`Contents of ${project.projectName}`}
              rows={visible}
              rowId={(r) => r.id}
              name={(r) => SECTIONS[r.section].label}
              text={(r) => SECTIONS[r.section].label}
              subtitle={(r) => countText(r.section)}
              bigIcon={(r) => <FolderGlyph badge={SECTIONS[r.section].icon} filled={!!counts[r.section]} />}
              icon={(r) => {
                const Icon = SECTIONS[r.section].icon
                return <Icon size={16} className="text-signal" />
              }}
              columns={[
                { key: 'items', label: 'Items', render: (r) => countText(r.section) },
                { key: 'purpose', label: 'Holds', render: (r) => SECTIONS[r.section].purpose, className: 'max-w-80 truncate' },
              ]}
              selectedId={selectedId}
              onSelect={select}
              onOpen={(r) => open(r.section)}
              onUp={() => navigate(vaultPath())}
              empty="No folders match your search."
            />
          </ListCard>
        }
        preview={
          <PreviewCard>
            {selected ? (
              (() => {
                const { label, purpose, icon: Icon } = SECTIONS[selected.section]
                return (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <Icon size={30} className="shrink-0 text-signal" aria-hidden="true" />
                      <div>
                        <h2 className="font-semibold text-text">{label}</h2>
                        <p className="text-xs text-text-muted">Folder · {countText(selected.section)}</p>
                      </div>
                    </div>
                    <p className="text-sm text-text">{purpose}</p>
                    <div className="border-t border-border pt-4">
                      <LoadingButton size="sm" icon={<FolderOpen size={14} />} onClick={() => open(selected.section)}>
                        Open
                      </LoadingButton>
                    </div>
                  </div>
                )
              })()
            ) : (
              <PreviewHint>
                <span>Select a folder to preview it.</span>
                <span className="text-xs">Double-click to open it.</span>
              </PreviewHint>
            )}
          </PreviewCard>
        }
      />
      <ProjectFormDialog
        open={!!actions.renaming}
        project={actions.renaming ?? undefined}
        onClose={() => actions.setRenaming(null)}
      />
      <DeleteProjectDialog
        project={actions.deleting}
        onClose={() => actions.setDeleting(null)}
        onDeleted={() => navigate(vaultPath(), { replace: true })}
      />
    </FolderPage>
  )
}
