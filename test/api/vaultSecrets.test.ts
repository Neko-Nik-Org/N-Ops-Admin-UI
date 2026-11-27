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
/** Tests for src/api/vaultSecrets.ts (the live `/vault/secret/keys/*` endpoints). */

import { describe, expect, it } from 'vitest'
import {
  addSecretVersion,
  countSecrets,
  createSecret,
  deleteSecret,
  exportDotenv,
  importDotenv,
  listSecrets,
  listSecretVersions,
  revealSecret,
  rollbackSecret,
  SECRET_PAGE_SIZE,
  secretValueError,
} from '@/api/vaultSecrets'
import { ApiError } from '@/types/api'
import { api } from '../testUtils'

const rawKey = (id: number, name: string, isHidden = false, version = 1) => ({
  secret_id: id,
  secret_name: name,
  current_version: version,
  is_hidden: isHidden,
  created_at: '2026-11-20T00:00:00Z',
  updated_at: '2026-11-21T00:00:00Z',
})
const page = <T>(data: T[], total = data.length) => ({ data: { total_count: total, data } })
const readValue = (value: string) => ({
  data: { project_id: 7, secret_id: 1, tag_id: 2, secret_value: value, hide_from_ui: false, details: {} },
})
const e112 = () => new ApiError('SQL Database error', 422, 'E112')

describe('listing keys', () => {
  it('lists a project per tag and maps the keys', async () => {
    api.get.mockImplementation(async (_url: string, config?: { params?: unknown }) =>
      page(
        (config?.params as { tag_id?: number } | undefined)?.tag_id === 2
          ? [rawKey(1, 'DATABASE_URL', false, 3)]
          : [rawKey(9, 'LOG_LEVEL', true)],
      ),
    )
    const keys = await listSecrets(7, [2, 5])
    expect(api.get).toHaveBeenCalledWith('/vault/secret/keys/list', {
      params: { project_id: 7, tag_id: 2, limit: SECRET_PAGE_SIZE, offset: 0 },
    })
    expect(keys).toEqual([
      {
        secretId: 1,
        projectId: 7,
        tagId: 2,
        name: 'DATABASE_URL',
        currentVersion: 3,
        isHidden: false,
        createdAt: '2026-11-20T00:00:00Z',
        updatedAt: '2026-11-21T00:00:00Z',
      },
      expect.objectContaining({ secretId: 9, tagId: 5, isHidden: true }),
    ])
  })

  it('pages until total_count is reached', async () => {
    const first = Array.from({ length: SECRET_PAGE_SIZE }, (_, i) => rawKey(i + 1, `K${i}`))
    api.get.mockResolvedValueOnce(page(first, SECRET_PAGE_SIZE + 1)).mockResolvedValueOnce(page([rawKey(999, 'LAST')], 101))
    expect(await listSecrets(7, [2])).toHaveLength(SECRET_PAGE_SIZE + 1)
    expect(api.get).toHaveBeenLastCalledWith('/vault/secret/keys/list', {
      params: { project_id: 7, tag_id: 2, limit: SECRET_PAGE_SIZE, offset: SECRET_PAGE_SIZE },
    })
  })

  it('counts keys across tags from total_count', async () => {
    api.get.mockResolvedValueOnce(page([], 3)).mockResolvedValueOnce(page([], 4))
    expect(await countSecrets(7, [1, 2])).toBe(7)
  })
})

describe('versions', () => {
  it('lists versions with the note and author from details', async () => {
    api.get.mockResolvedValue(
      page([
        { version_number: 2, is_hidden: true, details: { note: 'Rotate', created_by: 'Priya' }, created_at: 't2' },
        { version_number: 1, is_hidden: false, details: {}, created_at: 't1' },
      ]),
    )
    expect(await listSecretVersions({ secretId: 1, projectId: 7, tagId: 2 })).toEqual([
      { version: 2, isHidden: true, note: 'Rotate', createdBy: 'Priya', createdAt: 't2' },
      { version: 1, isHidden: false, note: '', createdBy: '', createdAt: 't1' },
    ])
    expect(api.get).toHaveBeenCalledWith('/vault/secret/keys/list-versions', {
      params: { project_id: 7, tag_id: 2, secret_id: 1, limit: SECRET_PAGE_SIZE, offset: 0 },
    })
  })

  it('reads a version, explaining the 404 a hidden one gets', async () => {
    api.get.mockResolvedValueOnce(readValue('postgres://x'))
    expect(await revealSecret(1, 3)).toBe('postgres://x')
    expect(api.get).toHaveBeenCalledWith('/vault/secret/keys/read/1/3')
    api.get.mockRejectedValueOnce(new ApiError('Secret key not found', 404))
    await expect(revealSecret(1, 2)).rejects.toThrow('v2 is hidden or no longer exists')
  })

  it('adds a version and rolls back', async () => {
    api.put.mockResolvedValue({ data: undefined })
    api.patch.mockResolvedValue({ data: undefined })
    await addSecretVersion({ secretId: 1, projectId: 7, tagId: 2 }, 'new', ' Rotate ', true, 'Priya')
    expect(api.put).toHaveBeenCalledWith('/vault/secret/keys/update', {
      project_id: 7,
      secret_id: 1,
      tag_id: 2,
      secret_value: 'new',
      hide_from_ui: true,
      details: { note: 'Rotate', created_by: 'Priya' },
    })
    await rollbackSecret(1, 2)
    expect(api.patch).toHaveBeenCalledWith('/vault/secret/keys/rollback/1/2')
  })
})

describe('creating and deleting', () => {
  it('creates a key after checking the name is free for the tag', async () => {
    api.get.mockResolvedValue(page([rawKey(1, 'DATABASE_URL')]))
    api.post.mockResolvedValue({ data: undefined })
    const input = { name: 'TOKEN', tagId: 2, value: 'x', note: '', isHidden: false }
    await createSecret(7, input, 'Priya')
    expect(api.post).toHaveBeenCalledWith('/vault/secret/keys/create', {
      project_id: 7,
      tag_id: 2,
      secret_name: 'TOKEN',
      secret_value: 'x',
      hide_from_ui: false,
      details: { note: 'Initial', created_by: 'Priya' },
    })
    await expect(createSecret(7, { ...input, name: 'DATABASE_URL' })).rejects.toThrow('already exists for this tag')
    await expect(createSecret(7, { ...input, name: '1BAD' })).rejects.toThrow('not starting with a number')
  })

  it('explains the bare E112 a full project gets', async () => {
    api.get.mockResolvedValue(page([]))
    api.post.mockRejectedValue(e112())
    await expect(createSecret(7, { name: 'TOKEN', tagId: 2, value: 'x', note: '', isHidden: false })).rejects.toThrow(
      "plan's key limit",
    )
  })

  it('validates values the way the API does (non-blank, at most 255 bytes)', () => {
    expect(secretValueError('  ')).toBe('Enter a value.')
    expect(secretValueError('a'.repeat(255))).toBeUndefined()
    expect(secretValueError('é'.repeat(128))).toContain('255 bytes')
  })

  it('deletes by project, tag and id', async () => {
    api.delete.mockResolvedValue({ data: undefined })
    await deleteSecret({ secretId: 1, projectId: 7, tagId: 2 })
    expect(api.delete).toHaveBeenCalledWith('/vault/secret/keys/delete', {
      params: { project_id: 7, tag_id: 2, secret_id: 1 },
    })
  })
})

describe('.env import and export', () => {
  it('creates new keys, adds versions for changed values, skips unchanged ones, always updates hidden ones', async () => {
    api.get.mockImplementation(async (url: string) => {
      if (url === '/vault/secret/keys/list')
        return page([rawKey(1, 'LOG_LEVEL', false, 2), rawKey(2, 'DB_URL'), rawKey(3, 'STRIPE_KEY', true)])
      return readValue(url.endsWith('/1/2') ? 'warn' : 'old')
    })
    api.post.mockResolvedValue({ data: undefined })
    api.put.mockResolvedValue({ data: undefined })
    const result = await importDotenv(7, 2, 'LOG_LEVEL=warn\nDB_URL=new\nSTRIPE_KEY=sk\nNEW_ONE=1', '', 'Priya')
    expect(result).toEqual({ created: 1, updated: 2, unchanged: 1 })
    expect(api.put).toHaveBeenCalledWith(
      '/vault/secret/keys/update',
      expect.objectContaining({ secret_id: 3, hide_from_ui: true, details: { note: 'Imported from .env', created_by: 'Priya' } }),
    )
    expect(api.get).not.toHaveBeenCalledWith('/vault/secret/keys/read/3/1')
    await expect(importDotenv(7, 2, 'not a line', '')).rejects.toThrow('Line 1: expected KEY=value')
  })

  it('exports the values in use, leaving hidden keys out', async () => {
    api.get.mockImplementation(async (url: string) =>
      url === '/vault/secret/keys/list' ? page([rawKey(2, 'B_KEY', false, 4), rawKey(1, 'A_HIDDEN', true)]) : readValue('b'),
    )
    const result = await exportDotenv(7, 2)
    expect(api.get).toHaveBeenCalledWith('/vault/secret/keys/read/2/4')
    expect(result).toMatchObject({ exported: 1, skippedHidden: ['A_HIDDEN'] })
    expect(result.body).toContain('B_KEY=b')
  })
})
