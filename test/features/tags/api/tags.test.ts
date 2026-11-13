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
/** Tests for src/features/tags/api/tags.ts. */

import { describe, expect, it } from 'vitest'
import { createTag, deleteTag, getTag, listTags, updateTag } from '@/features/tags/api/tags'
import { api } from '../../../testUtils'

const rawTag = { tag_id: 3, organization_id: 'org-1', tag_name: 'production', tag_description: 'Live servers' }
const tag = { tagId: 3, tagName: 'production', tagDescription: 'Live servers' }

describe('tags api', () => {
  it('lists tags', async () => {
    api.get.mockResolvedValue({ data: [rawTag] })
    await expect(listTags()).resolves.toEqual([tag])
    expect(api.get).toHaveBeenCalledWith('/tag/list')
  })

  it('gets one tag', async () => {
    api.get.mockResolvedValue({ data: rawTag })
    await expect(getTag(3)).resolves.toEqual(tag)
    expect(api.get).toHaveBeenCalledWith('/tag/get/3')
  })

  it('creates a tag', async () => {
    api.post.mockResolvedValue({ data: undefined })
    await createTag({ tagName: 'staging', tagDescription: '' })
    expect(api.post).toHaveBeenCalledWith('/tag/create', { tag_name: 'staging', tag_description: '' })
  })

  it('updates a tag', async () => {
    api.put.mockResolvedValue({ data: undefined })
    await updateTag(3, { tagName: 'prod', tagDescription: 'x' })
    expect(api.put).toHaveBeenCalledWith('/tag/update', { tag_id: 3, tag_name: 'prod', tag_description: 'x' })
  })

  it('deletes a tag', async () => {
    api.delete.mockResolvedValue({ data: undefined })
    await deleteTag(3)
    expect(api.delete).toHaveBeenCalledWith('/tag/delete/3')
  })
})
