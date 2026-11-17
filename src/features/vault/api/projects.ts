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
 * The mock side of vault projects. Projects themselves are live (./vaultProjects.ts); what's inside
 * them (Env keys, Conf files, Notes) is still mock data, keyed by project id. The sample contents
 * use ids 1–4, so a real project with one of those ids shows sample items and any other starts empty.
 */

import { db as adminDb } from '@/mocks/adminDb'
import { mockDelay } from '@/mocks/helpers'
import { vaultDb } from '@/mocks/vaultDb'

/**
 * A project's name for mock audit entries, e.g. "payments-api". Real projects the mock doesn't
 * know are shown by id.
 */
export const projectPath = (projectId: number) =>
  vaultDb.projects.find((p) => p.projectId === projectId)?.projectName ?? `project #${projectId}`

/** Mock of how much a project holds, for the delete confirmation. */
export const getProjectContents = async (projectId: number) => {
  await mockDelay()
  return {
    secrets: vaultDb.secrets.filter((s) => s.projectId === projectId).length,
    configs: vaultDb.configs.filter((c) => c.projectId === projectId).length,
    notes: vaultDb.notes.filter((n) => n.projectId === projectId).length,
  }
}

/**
 * After a real project is deleted, drops the mock keys, files and notes that were inside it, and its
 * links from API keys (the API's ON DELETE CASCADE does the same for the real tables).
 */
export const forgetProjectContents = (projectId: number) => {
  vaultDb.secrets = vaultDb.secrets.filter((s) => s.projectId !== projectId)
  vaultDb.configs = vaultDb.configs.filter((c) => c.projectId !== projectId)
  vaultDb.notes = vaultDb.notes.filter((n) => n.projectId !== projectId)
  for (const key of adminDb.apiKeys) key.vaultProjectIds = key.vaultProjectIds.filter((id) => id !== projectId)
}
