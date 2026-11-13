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

/** React Query hooks for listing and editing tags. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createTag, deleteTag, getTag, listTags, updateTag } from '../api/tags'
import type { Tag, TagInput } from '../types'

/** Cache key prefix shared by the tag list and single-tag queries. */
const TAGS_KEY = ['tags'] as const

/** All tags the signed-in user can see. */
export const useTags = () => useQuery({ queryKey: TAGS_KEY, queryFn: listTags, retry: false })

/** Fetches one tag fresh from `GET /tag/get/{id}`, seeded from the list so the form fills instantly. */
export const useTag = (tagId: number | null, seed?: Tag) =>
  useQuery({
    queryKey: [...TAGS_KEY, tagId],
    queryFn: () => getTag(tagId as number),
    enabled: tagId !== null,
    initialData: seed,
    initialDataUpdatedAt: 0, // treat the seed as stale so the real record is fetched
    retry: false,
  })

/** Returns a function that marks every tag query stale, so lists refetch after a change. */
const useInvalidateTags = () => {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: TAGS_KEY })
}

/** Creates a tag, then refreshes the tag lists. */
export const useCreateTag = () => {
  const invalidate = useInvalidateTags()
  return useMutation({ mutationFn: (input: TagInput) => createTag(input), onSuccess: invalidate })
}

/** Updates a tag's name and description, then refreshes the tag lists. */
export const useUpdateTag = () => {
  const invalidate = useInvalidateTags()
  return useMutation({
    mutationFn: ({ tagId, input }: { tagId: number; input: TagInput }) => updateTag(tagId, input),
    onSuccess: invalidate,
  })
}

/** Deletes a tag, then refreshes the tag lists. */
export const useDeleteTag = () => {
  const invalidate = useInvalidateTags()
  return useMutation({ mutationFn: (tagId: number) => deleteTag(tagId), onSuccess: invalidate })
}
