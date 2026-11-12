import { apiClient } from '@/lib/axios'
import type { Tag } from '../types'

interface RawTag {
  tag_id: number
  organization_id: string
  tag_name: string
  tag_description: string
}

/** Real endpoint — `GET /tag/list` (requires the `tag:view` permission). */
export const listTags = async (): Promise<Tag[]> => {
  const { data } = await apiClient.get<RawTag[]>('/tag/list')
  return data.map((t) => ({ tagId: t.tag_id, tagName: t.tag_name, tagDescription: t.tag_description }))
}
