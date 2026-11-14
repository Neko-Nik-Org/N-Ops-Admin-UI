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
import { useAtom } from 'jotai'
import { createTag, deleteTag, getTag, listTags, updateTag } from '../api/tags'
import { selectedTagIdAtom } from '../store/selectedTag'
import type { Tag, TagInput } from '../types'

/** Cache key prefix shared by the tag list and single-tag queries. */
const TAGS_KEY = ['tags'] as const

/** All tags the signed-in user can see. */
export const useTags = () => useQuery({ queryKey: TAGS_KEY, queryFn: listTags, retry: false })

/**
 * The tag the dashboard is scoped to. A saved id that is not in the user's tag list (deleted, or
 * saved by another account on this browser) reads as null, i.e. "All tags".
 */
export const useSelectedTag = () => {
  const { data: tags } = useTags()
  const [storedId, setSelectedTagId] = useAtom(selectedTagIdAtom)
  const selectedTag = tags?.find((t) => t.tagId === storedId) ?? null
  return { tags, selectedTag, selectedTagId: selectedTag?.tagId ?? null, setSelectedTagId }
}

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
