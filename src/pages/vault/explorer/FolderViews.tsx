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
/** Folder views: the Vault root (project folders) and a project (its Env / Conf / Notes tabs). */

import { Folder, FolderOpen, FolderPlus, Pencil, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LoadingButton } from '@/components/LoadingButton'
import { DeleteProjectDialog, ProjectFormDialog } from '@/pages/vault/ProjectDialogs'
import { useOrgInfo } from '@/hooks/useAccount'
import { useHasPermissions } from '@/hooks/usePermissions'
import type { VaultProject } from '@/types/vault'
import { cn } from '@/utils/cn'
import { formatDateTime, formatRelative } from '@/utils/format'
import { FolderContents, FolderHeader, FolderLayout, FolderPage, ListCard, PreviewCard } from './ExplorerParts'
import { FolderGlyph } from './ExplorerIcons'
import { plural, SECTION_ORDER, SECTIONS, vaultPath, type VaultSection } from './sections'
import { useSectionCounts } from './useSectionCounts'
import { SectionToolbarSlot } from './sectionToolbarSlot'
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
 * A project in the preview card: what's inside (the same counts as the project's folder list, so other
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
              detailsSubtitle={(p) => p.description || 'No description'}
              bigIcon={(p) => <ProjectFolderIcon projectId={p.projectId} />}
              icon={() => <Folder size={16} className="text-warning" />}
              columns={[
                {
                  key: 'created',
                  label: 'Created',
                  render: (p) => <span title={formatDateTime(p.createdAt)}>{formatRelative(p.createdAt)}</span>,
                },
                {
                  key: 'modified',
                  label: 'Modified',
                  render: (p) => <span title={formatDateTime(p.updatedAt)}>{formatRelative(p.updatedAt)}</span>,
                },
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
          selected && (
            <PreviewCard onClose={() => select(null)}>
              <ProjectPreview
                project={selected}
                canRename={actions.canRename}
                canDelete={actions.canDelete}
                onOpen={() => open(selected)}
                onRename={() => actions.setRenaming(selected)}
                onDelete={() => actions.setDeleting(selected)}
              />
            </PreviewCard>
          )
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

/**
 * Inside a project: its path (Vault › project) and one tab per folder (Env, Conf, Notes),
 * with the open folder below. Each tab has its own URL (`/vault/<id>/env` …), so links, back and
 * forward keep working.
 */
export const ProjectView = ({
  project,
  section,
  children,
}: {
  project: VaultProject
  section: VaultSection
  /** The open folder's view. */
  children: ReactNode
}) => {
  const counts = useSectionCounts(project.projectId)
  // the open folder's buttons (New key, Import .env …) render here, at the right end of the tabs
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null)

  // just the path above the tabs; renaming and deleting a project happen in the Vault's project list
  return (
    <FolderPage header={<FolderHeader path={[ROOT_CRUMB]} title={project.projectName} pathOnly />}>
      {/*
        The grey baseline is an inset shadow, not a border, so the active tab's underline can sit on
        it without sticking out. On narrow screens the buttons wrap above the tabs, and the tabs scroll
        sideways.
      */}
      <div className="-mt-2 flex flex-wrap-reverse items-end justify-between gap-x-4 gap-y-2 shadow-[inset_0_-1px_0_var(--color-border)]">
        <nav aria-label={`${project.projectName} folders`} className="flex min-w-0 gap-1 overflow-x-auto overflow-y-hidden">
          {SECTION_ORDER.map((s) => {
            const { label, icon: Icon, purpose } = SECTIONS[s]
            const active = s === section
            return (
              <Link
                key={s}
                to={vaultPath(project.projectId, s)}
                aria-current={active ? 'page' : undefined}
                aria-label={counts[s] === undefined ? label : `${label}, ${plural(counts[s]!, SECTIONS[s].noun)}`}
                title={purpose}
                className={cn(
                  'flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'border-signal text-text'
                    : 'border-transparent text-text-muted hover:border-border-strong hover:text-text',
                )}
              >
                <Icon size={15} className={active ? 'text-signal' : undefined} aria-hidden="true" />
                {label}
                <span className="rounded-full bg-ink px-1.5 py-0.5 text-[0.6875rem] text-text-muted">{counts[s] ?? '…'}</span>
              </Link>
            )
          })}
        </nav>
        <div ref={setToolbarSlot} className="ml-auto pb-1.5 empty:hidden" />
      </div>
      <SectionToolbarSlot.Provider value={toolbarSlot}>{children}</SectionToolbarSlot.Provider>
    </FolderPage>
  )
}
