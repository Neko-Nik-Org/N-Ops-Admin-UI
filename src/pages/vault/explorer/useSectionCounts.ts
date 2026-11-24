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

import { useSelectedTag } from '@/hooks/useTags'
import { useConfigs, useNotes, useSecrets } from '@/hooks/useVault'
import type { VaultSection } from './sections'

/** Item counts for a project's folders; Env and Conf follow the top bar's tag, Notes have none. */
export const useSectionCounts = (projectId: number | null): Partial<Record<VaultSection, number>> => {
  const { selectedTag } = useSelectedTag()
  const byTag = <T extends { tagId: number }>(items?: T[]) =>
    items && (selectedTag ? items.filter((i) => i.tagId === selectedTag.tagId) : items).length
  const { data: secrets } = useSecrets(projectId)
  const { data: configs } = useConfigs(projectId)
  const { data: notes } = useNotes(projectId)
  return { env: byTag(secrets), conf: byTag(configs), notes: notes?.length }
}
