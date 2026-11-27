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
 * What's inside vault projects. Projects (./vaultProjects.ts) and their Env keys (./vaultSecrets.ts)
 * are live; Conf files and Notes are kept in memory by project id until those endpoints exist.
 */

import { db as adminDb } from '@/data/mockAdmin'
import { mockDelay } from '@/data/mockHelpers'
import { vaultDb } from '@/data/mockVault'
import { countSecrets } from './vaultSecrets'

/**
 * A project's name for mock audit entries, e.g. "payments-api". Real projects the mock doesn't
 * know are shown by id.
 */
export const projectPath = (projectId: number) =>
  vaultDb.projects.find((p) => p.projectId === projectId)?.projectName ?? `project #${projectId}`

/**
 * How much a project holds, for the delete confirmation. Keys are counted live across `tagIds` (the
 * tags the user can see, so a tag-restricted user may see fewer than there are).
 */
export const getProjectContents = async (projectId: number, tagIds: readonly number[]) => {
  // null when the keys can't be counted (e.g. no vault:keys:view)
  const [secrets] = await Promise.all([countSecrets(projectId, tagIds).catch(() => null), mockDelay()])
  return {
    secrets,
    configs: vaultDb.configs.filter((c) => c.projectId === projectId).length,
    notes: vaultDb.notes.filter((n) => n.projectId === projectId).length,
  }
}

/**
 * After a real project is deleted, drops the mock files and notes that were inside it, and its links
 * from API keys (the API's ON DELETE CASCADE does the same for the real tables, keys included).
 */
export const forgetProjectContents = (projectId: number) => {
  vaultDb.configs = vaultDb.configs.filter((c) => c.projectId !== projectId)
  vaultDb.notes = vaultDb.notes.filter((n) => n.projectId !== projectId)
  for (const key of adminDb.apiKeys) key.vaultProjectIds = key.vaultProjectIds.filter((id) => id !== projectId)
}
