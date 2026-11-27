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
 * A small in-memory `/vault/secret/keys/*` backend for page tests, on top of the mocked apiClient.
 * Call it after `serveLiveReads()`: requests it doesn't know fall through to what was set before.
 * It behaves like the Main API: keys are listed per project + tag, values come back only from
 * `read` and never for a hidden version (404), and duplicates fail with a bare E112.
 */

import { ApiError } from '@/types/api'
import { api } from './testUtils'

export interface FakeVersion {
  version: number
  value: string
  hidden: boolean
  details: Record<string, unknown>
  createdAt: string
}

export interface FakeKey {
  secretId: number
  projectId: number
  tagId: number
  name: string
  current: number
  versions: FakeVersion[]
  createdAt: string
  updatedAt: string
}

const T = '2026-11-01T00:00:00Z'

/** `[value, by, note, hidden?]`, oldest first. */
type Row = [string, string, string, boolean?]

const ROWS: Array<[number, string, number, Row[], number?]> = [
  [
    1,
    'DATABASE_URL',
    1,
    [
      ['postgres://payments:Xk2v9Qe1@db-primary.internal:5432/payments', 'Neko Nik', 'Initial'],
      ['postgres://payments:Lm8Rt3Zp@db-primary.internal:5432/payments', 'Priya Rao', 'Quarterly rotation'],
      ['postgres://payments:Hd7Wq4Ns@db-primary.internal:5432/payments?sslmode=require', 'Priya Rao', 'Require TLS'],
    ],
  ],
  [1, 'DATABASE_URL', 2, [['postgres://payments:staging-pass@db-staging.internal:5432/payments', 'Marcus Chen', 'Initial']]],
  [1, 'DATABASE_URL', 3, [['postgres://payments:dev@localhost:5432/payments', 'Tomás Ruiz', 'Initial']]],
  [
    1,
    'STRIPE_SECRET_KEY',
    1,
    [
      ['example_stripe_key_51Hc2f…old1', 'Neko Nik', 'Initial'],
      ['example_stripe_key_51Hc2f9QpZt4mK2lYv8Rx', 'Priya Rao', 'Rolled after Stripe dashboard change', true],
      ['example_stripe_key_51Hc2f7WqLp0dJ6nUe3Ta', 'Priya Rao', 'Rotated after leak drill', true],
    ],
  ],
  [1, 'STRIPE_SECRET_KEY', 2, [['sk_test_51Hc2fA8bC3dE4fG5hI6j', 'Marcus Chen', 'Initial']]],
  [
    1,
    'JWT_SIGNING_KEY',
    1,
    [
      ['b64:3q2+7w==9fK1aYp2Lm', 'Neko Nik', 'Initial'],
      ['b64:Zx9!Qw2#Er4$Ty6^Ui8', 'Marcus Chen', 'Rotate signing key'],
    ],
    1, // rolled back
  ],
  [1, 'LOG_LEVEL', 1, [['warn', 'Neko Nik', 'Initial']]],
  [
    1,
    'LOG_LEVEL',
    2,
    [
      ['info', 'Marcus Chen', 'Initial'],
      ['debug', 'Aisha Bello', 'Chasing webhook bug'],
    ],
  ],
  [1, 'QUEUE_URL', 1, [['amqps://worker:Vb6Nm2Qa@mq.internal:5671/payouts', 'Neko Nik', 'Initial']]],
  [1, 'SENTRY_DSN', 1, [['https://4f1c2e@o12345.ingest.sentry.io/678', 'Neko Nik', 'Initial']]],
  [
    1,
    'CONCURRENCY',
    1,
    [
      ['8', 'Neko Nik', 'Initial'],
      ['16', 'Aisha Bello', 'Black Friday load'],
    ],
  ],
  [2, 'SESSION_SECRET', 1, [['c1f9a7e3d5b2468f0e9d8c7b6a5f4e3d', 'Lena Fischer', 'Initial']]],
]

const seed = (): FakeKey[] =>
  ROWS.map(([projectId, name, tagId, rows, current], i) => ({
    secretId: i + 1,
    projectId,
    tagId,
    name,
    current: current ?? rows.length,
    createdAt: T,
    updatedAt: T,
    versions: rows.map(([value, by, note, hidden = false], v) => ({
      version: v + 1,
      value,
      hidden,
      details: { note, created_by: by },
      createdAt: T,
    })),
  }))

type Params = Record<string, number>
type Body = Record<string, unknown>

const notFound = () => new ApiError('Secret key not found, or not accessible to the user', 404)
const e112 = () => new ApiError('SQL Database error', 422, 'E112')
const pageOf = <T>(rows: T[], p: Params) => ({
  data: { total_count: rows.length, data: rows.slice(p.offset ?? 0, (p.offset ?? 0) + (p.limit ?? rows.length)) },
})

/** Serves the secret-key endpoints from a fresh copy of the sample keys, and returns that store. */
export const serveSecretKeys = (): FakeKey[] => {
  const keys = seed()
  let nextId = keys.length + 1
  const byId = (id: number) => keys.find((k) => k.secretId === id)
  const now = () => new Date().toISOString()

  const get = api.get.getMockImplementation()
  api.get.mockImplementation(async (url: string, config?: { params?: unknown }) => {
    const p = (config?.params ?? {}) as Params
    if (url === '/vault/secret/keys/list') {
      const rows = keys
        .filter((k) => k.projectId === p.project_id && k.tagId === p.tag_id)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((k) => ({
          secret_id: k.secretId,
          secret_name: k.name,
          current_version: k.current,
          is_hidden: k.versions.find((v) => v.version === k.current)!.hidden,
          created_at: k.createdAt,
          updated_at: k.updatedAt,
        }))
      return pageOf(rows, p)
    }
    if (url === '/vault/secret/keys/list-versions') {
      const k = byId(p.secret_id!)
      const rows = k && k.projectId === p.project_id && k.tagId === p.tag_id ? [...k.versions].reverse() : []
      return pageOf(
        rows.map((v) => ({ version_number: v.version, is_hidden: v.hidden, details: v.details, created_at: v.createdAt })),
        p,
      )
    }
    if (url.startsWith('/vault/secret/keys/read/')) {
      const [id, version] = url.split('/').slice(-2).map(Number)
      const k = byId(id!)
      const v = k?.versions.find((x) => x.version === version)
      if (!k || !v || v.hidden) throw notFound()
      return {
        data: {
          project_id: k.projectId,
          secret_id: k.secretId,
          tag_id: k.tagId,
          secret_value: v.value,
          hide_from_ui: v.hidden,
          details: v.details,
        },
      }
    }
    return get ? get(url, config as never) : { data: [] }
  })

  const post = api.post.getMockImplementation()
  api.post.mockImplementation(async (url: string, data?: unknown, config?: unknown) => {
    if (url !== '/vault/secret/keys/create') return post ? post(url, data, config as never) : { data: undefined }
    const b = data as Body
    const [projectId, tagId, name] = [b.project_id as number, b.tag_id as number, b.secret_name as string]
    if (keys.some((k) => k.projectId === projectId && k.tagId === tagId && k.name === name)) throw e112()
    keys.push({
      secretId: nextId++,
      projectId,
      tagId,
      name,
      current: 1,
      createdAt: now(),
      updatedAt: now(),
      versions: [
        { version: 1, value: b.secret_value as string, hidden: !!b.hide_from_ui, details: b.details as Body, createdAt: now() },
      ],
    })
    return { data: undefined }
  })

  const put = api.put.getMockImplementation()
  api.put.mockImplementation(async (url: string, data?: unknown, config?: unknown) => {
    if (url !== '/vault/secret/keys/update') return put ? put(url, data, config as never) : { data: undefined }
    const b = data as Body
    const k = byId(b.secret_id as number)
    if (!k || k.projectId !== b.project_id || k.tagId !== b.tag_id) throw e112()
    const version = k.versions.length + 1
    k.versions.push({
      version,
      value: b.secret_value as string,
      hidden: !!b.hide_from_ui,
      details: b.details as Body,
      createdAt: now(),
    })
    Object.assign(k, { current: version, updatedAt: now() })
    return { data: undefined }
  })

  const patch = api.patch.getMockImplementation()
  api.patch.mockImplementation(async (url: string, data?: unknown, config?: unknown) => {
    if (!url.startsWith('/vault/secret/keys/rollback/')) return patch ? patch(url, data, config as never) : { data: undefined }
    const [id, version] = url.split('/').slice(-2).map(Number)
    const k = byId(id!)
    if (!k || !k.versions.some((v) => v.version === version)) throw notFound()
    Object.assign(k, { current: version, updatedAt: now() })
    return { data: undefined }
  })

  const del = api.delete.getMockImplementation()
  api.delete.mockImplementation(async (url: string, config?: { params?: unknown }) => {
    if (url !== '/vault/secret/keys/delete') return del ? del(url, config as never) : { data: undefined }
    const p = (config?.params ?? {}) as Params
    const i = keys.findIndex((k) => k.secretId === p.secret_id && k.projectId === p.project_id && k.tagId === p.tag_id)
    if (i < 0) throw new ApiError('Secret key not found, or not accessible to the user', 400)
    keys.splice(i, 1)
    return { data: undefined }
  })

  return keys
}
