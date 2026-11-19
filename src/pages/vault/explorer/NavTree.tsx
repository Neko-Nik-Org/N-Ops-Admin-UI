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
/** The explorer's navigation pane: Vault, its project folders, and each project's Env / Conf / Notes. */

import { ChevronRight, Folder, FolderOpen, HardDrive as VaultIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { VaultProject } from '@/features/vault/types'
import { cn } from '@/utils/cn'
import { SECTION_ORDER, SECTIONS, vaultPath, type VaultSection } from './sections'
import { useSectionCounts } from './useSectionCounts'

/** Same look as the main sidebar's links. */
const rowClass = (current: boolean) =>
  cn(
    'flex min-w-0 flex-1 items-center gap-2.5 rounded-md py-1.5 pr-2.5 text-sm transition-colors duration-150',
    current ? 'bg-signal/15 font-medium text-signal' : 'text-text-muted hover:bg-surface-raised hover:text-text',
  )

/** A project's three folders, with counts (only mounted while the project is expanded). */
const ProjectChildren = ({ projectId, section }: { projectId: number; section: VaultSection | null }) => {
  const counts = useSectionCounts(projectId)
  return (
    <ul role="group">
      {SECTION_ORDER.map((s) => {
        const { label, icon: Icon } = SECTIONS[s]
        const current = s === section
        return (
          <li key={s} role="treeitem" aria-selected={current} className="flex pl-7">
            <Link to={vaultPath(projectId, s)} className={rowClass(current)} aria-current={current ? 'page' : undefined}>
              <Icon size={15} className="ml-2.5 shrink-0" aria-hidden="true" />
              <span className="flex-1 truncate">{label}</span>
              {counts[s] !== undefined && <span className="text-xs text-text-muted">{counts[s]}</span>}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Folder tree. The open project is always expanded; others expand with their chevron (or by
 * opening them). Each entry is a link, so it works with the browser's history.
 */
export const NavTree = ({
  projects,
  projectId,
  section,
}: {
  projects: readonly VaultProject[]
  projectId: number | null
  section: VaultSection | null
}) => {
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set())
  const isOpen = (id: number) => expanded.has(id) || id === projectId
  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (isOpen(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <nav aria-label="Folders" className="sticky top-4 hidden max-h-[calc(100vh-6rem)] overflow-auto xl:block">
      <p className="mb-2 px-2.5 text-xs font-medium tracking-wide text-text-muted uppercase">Folders</p>
      <ul role="tree" aria-label="Vault folders">
        <li role="treeitem" aria-expanded aria-selected={projectId === null}>
          <div className="flex">
            <Link
              to={vaultPath()}
              className={cn(rowClass(projectId === null), 'pl-2.5')}
              aria-current={projectId === null ? 'page' : undefined}
            >
              <VaultIcon size={16} className="shrink-0" aria-hidden="true" />
              <span className="truncate">Vault</span>
            </Link>
          </div>
          <ul role="group">
            {projects.map((p) => {
              const open = isOpen(p.projectId)
              const current = p.projectId === projectId && section === null
              return (
                <li key={p.projectId} role="treeitem" aria-expanded={open} aria-selected={current}>
                  <div className="flex items-center pl-1.5">
                    <button
                      type="button"
                      onClick={() => toggle(p.projectId)}
                      aria-label={`${open ? 'Collapse' : 'Expand'} ${p.projectName}`}
                      className="rounded p-0.5 text-text-muted hover:bg-surface-raised hover:text-text"
                    >
                      <ChevronRight size={14} className={cn('transition-transform', open && 'rotate-90')} aria-hidden="true" />
                    </button>
                    <Link
                      to={vaultPath(p.projectId)}
                      className={cn(rowClass(current), 'pl-1')}
                      aria-current={current ? 'page' : undefined}
                    >
                      {open ? (
                        <FolderOpen size={16} className="shrink-0 text-warning" aria-hidden="true" />
                      ) : (
                        <Folder size={16} className="shrink-0 text-warning" aria-hidden="true" />
                      )}
                      <span className="truncate">{p.projectName}</span>
                    </Link>
                  </div>
                  {open && <ProjectChildren projectId={p.projectId} section={p.projectId === projectId ? section : null} />}
                </li>
              )
            })}
          </ul>
        </li>
      </ul>
    </nav>
  )
}
