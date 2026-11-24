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
/** Tag choices for forms and tag names for tables, from the real tag API (`GET /tag/list`). */

import { useTags } from '@/hooks/useTags'

/**
 * The organization's tags to pick from (only those the user may access, as the API filters them),
 * and a lookup that names any id, falling back to "#id" for a tag that doesn't exist or isn't
 * visible (e.g. one referenced by the still-mock Vault and API key data).
 */
export const useTagOptions = () => {
  const { data } = useTags()
  const options = (data ?? []).map(({ tagId, tagName }) => ({ tagId, tagName }))
  const tagName = (tagId: number) => options.find((t) => t.tagId === tagId)?.tagName ?? `#${tagId}`
  return { options, tagName }
}
