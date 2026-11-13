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
 * API calls for tags. Tags group resources (servers, secrets, ...) and limit
 * which of them a user can access.
 */

import { apiClient } from '@/lib/axios'
import type { Tag, TagInput } from '../types'

/** Tag as sent by the API. */
interface RawTag {
  tag_id: number
  organization_id: string
  tag_name: string
  tag_description: string
}

/** Maps an API tag to the app's camelCase Tag. */
const toTag = (t: RawTag): Tag => ({ tagId: t.tag_id, tagName: t.tag_name, tagDescription: t.tag_description })

/** `GET /tag/list` — requires `tag:view`. */
export const listTags = async (): Promise<Tag[]> => {
  const { data } = await apiClient.get<RawTag[]>('/tag/list')
  return data.map(toTag)
}

/** `GET /tag/get/{id}` — no permission needed, only access to that tag. */
export const getTag = async (tagId: number): Promise<Tag> => {
  const { data } = await apiClient.get<RawTag>(`/tag/get/${tagId}`)
  return toTag(data)
}

/** `POST /tag/create` — requires `tag:view` + `tag:create`. Responds 201 with no body. */
export const createTag = async (input: TagInput): Promise<void> => {
  await apiClient.post('/tag/create', { tag_name: input.tagName, tag_description: input.tagDescription })
}

/** `PUT /tag/update` — requires `tag:view` + `tag:edit` and access to the tag. */
export const updateTag = async (tagId: number, input: TagInput): Promise<void> => {
  await apiClient.put('/tag/update', { tag_id: tagId, tag_name: input.tagName, tag_description: input.tagDescription })
}

/** `DELETE /tag/delete/{id}` — requires `tag:view` + `tag:delete` and access to the tag. */
export const deleteTag = async (tagId: number): Promise<void> => {
  await apiClient.delete(`/tag/delete/${tagId}`)
}
