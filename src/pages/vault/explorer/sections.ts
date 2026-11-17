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
/** The three folders inside every vault project, and Vault explorer paths. */

import { FileCog, KeyRound, NotebookPen, type LucideIcon } from 'lucide-react'
import { ROUTES } from '@/constants/routes'

/** A folder inside a project. */
export type VaultSection = 'env' | 'conf' | 'notes'

export interface SectionInfo {
  label: string
  /** What the folder holds, shown as its "type" and in the preview pane. */
  purpose: string
  icon: LucideIcon
  /** What one item is called, e.g. "key". */
  noun: string
}

export const SECTIONS: Readonly<Record<VaultSection, SectionInfo>> = {
  env: {
    label: 'Env',
    purpose: 'Deployment credentials and application secrets, as environment variables.',
    icon: KeyRound,
    noun: 'key',
  },
  conf: {
    label: 'Conf',
    purpose: 'Deployable configuration files, like nginx.conf or docker-compose.yml.',
    icon: FileCog,
    noun: 'file',
  },
  notes: {
    label: 'Notes',
    purpose: 'Human-readable sensitive information: docs, recovery instructions, runbooks. Private unless shared; not tagged.',
    icon: NotebookPen,
    noun: 'note',
  },
}

export const SECTION_ORDER: readonly VaultSection[] = ['env', 'conf', 'notes']

export const isSection = (value: string | undefined): value is VaultSection =>
  value === 'env' || value === 'conf' || value === 'notes'

/** URL of a place in the explorer: the Vault root, a project folder, or one of its folders. */
export const vaultPath = (projectId?: number, section?: VaultSection) =>
  projectId === undefined ? ROUTES.vault : section ? `${ROUTES.vault}/${projectId}/${section}` : `${ROUTES.vault}/${projectId}`

/** "1 key", "3 keys". */
export const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`
