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
/** Tag choices for the Admin forms, bridging the real tag API and the mock admin data. */

import { useTags } from '@/features/tags/hooks/useTags'

/** The tags the mock admin data refers to (ids 1–4), used when the real tag list is empty or unavailable. */
const SAMPLE_TAGS = [
  { tagId: 1, tagName: 'production' },
  { tagId: 2, tagName: 'staging' },
  { tagId: 3, tagName: 'development' },
  { tagId: 4, tagName: 'internal' },
]

/**
 * Tags to pick from (the organization's real tags when there are any, otherwise the samples)
 * and a lookup that names any id, falling back to the sample names and then "#id".
 */
export const useTagOptions = () => {
  const { data } = useTags()
  const options = data?.length ? data.map(({ tagId, tagName }) => ({ tagId, tagName })) : SAMPLE_TAGS
  const tagName = (tagId: number) =>
    options.find((t) => t.tagId === tagId)?.tagName ?? SAMPLE_TAGS.find((t) => t.tagId === tagId)?.tagName ?? `#${tagId}`
  return { options, tagName }
}
