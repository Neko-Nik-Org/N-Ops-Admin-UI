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
/** Tests for src/features/tags/hooks/useTags.ts. */

import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useCreateTag, useDeleteTag, useTag, useTags, useUpdateTag } from '@/features/tags/hooks/useTags'
import { api, renderHookWithProviders } from '../../../testUtils'

const raw = (id: number, name: string) => ({ tag_id: id, organization_id: 'o', tag_name: name, tag_description: '' })

describe('tag hooks', () => {
  it('loads the tag list', async () => {
    api.get.mockResolvedValue({ data: [raw(1, 'prod')] })
    const { result } = renderHookWithProviders(() => useTags())
    await waitFor(() => expect(result.current.data).toEqual([{ tagId: 1, tagName: 'prod', tagDescription: '' }]))
  })

  it('shows the seed immediately, then the fresh record', async () => {
    api.get.mockResolvedValue({ data: raw(1, 'prod-renamed') })
    const seed = { tagId: 1, tagName: 'prod', tagDescription: '' }
    const { result } = renderHookWithProviders(() => useTag(1, seed))

    expect(result.current.data).toEqual(seed)
    await waitFor(() => expect(result.current.data?.tagName).toBe('prod-renamed'))
    expect(api.get).toHaveBeenCalledWith('/tag/get/1')
  })

  it('does not fetch without a tag id', () => {
    renderHookWithProviders(() => useTag(null))
    expect(api.get).not.toHaveBeenCalled()
  })

  it.each([
    ['create', () => useCreateTag(), (m: ReturnType<typeof useCreateTag>) => m.mutateAsync({ tagName: 'x', tagDescription: '' })],
    ['update', () => useUpdateTag(), (m: ReturnType<typeof useUpdateTag>) => m.mutateAsync({ tagId: 1, input: { tagName: 'x', tagDescription: '' } })],
    ['delete', () => useDeleteTag(), (m: ReturnType<typeof useDeleteTag>) => m.mutateAsync(1)],
  ] as const)('refetches the list after a %s', async (_, useMutationHook, run) => {
    api.get.mockResolvedValue({ data: [raw(1, 'prod')] })
    api.post.mockResolvedValue({ data: undefined })
    api.put.mockResolvedValue({ data: undefined })
    api.delete.mockResolvedValue({ data: undefined })
    const { result } = renderHookWithProviders(() => ({ list: useTags(), mutation: useMutationHook() }))
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true))
    expect(api.get).toHaveBeenCalledTimes(1)

    await act(() => run(result.current.mutation as any))

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2))
  })
})
