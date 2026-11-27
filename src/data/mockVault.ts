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
 * In-memory store for what's inside vault projects. Projects (`/vault/project/*`) and Env keys
 * (`/vault/secret/keys/*`) are live, but the API has no Conf/Notes endpoints yet, so
 * `api/vaultConfigs.ts` and `api/vaultNotes.ts` call this. The app starts it empty; the sample data
 * below is loaded only by `resetVaultMock()` in tests. It shares the Admin mock's users, plan limits
 * and audit log, keeps changes until reload, and treats versions as immutable.
 *
 * Tag ids: 1 production, 2 staging, 3 development, 4 internal.
 * Notes as seen by the mock signed-in user (Neko Nik, user 1): "On-call runbook" is Priya's, shared
 * with them to edit; "Break-glass DB access" is their own; "CDN cutover checklist" is Lena's,
 * shared read-only; "Vendor contacts" and "Priya's interview notes" are private to others.
 */

import moment from 'moment'
import { db as adminDb } from '@/data/mockAdmin'
import type { ConfigFile, ConfigVersion, NoteLink, NoteShare, NoteVersion, VaultProject } from '@/types/vault'

const ago = (days: number, hours = 0) => moment().subtract(days, 'days').subtract(hours, 'hours').toISOString()

/** A config file with all its versions. */
export interface StoredConfig extends ConfigFile {
  versions: ConfigVersion[]
}
/** A note with its versions. */
export interface StoredNote {
  noteId: number
  projectId: number
  ownerId: number
  createdAt: string
  shares: NoteShare[]
  links: NoteLink[]
  versions: NoteVersion[]
}

const seedProjects = (): VaultProject[] =>
  (
    [
      ['payments-api', 'Card payments and payouts.', 210],
      ['web', 'Customer site and dashboard.', 190],
      ['billing', 'Invoices and subscriptions.', 120],
      ['internal-tools', 'Grafana, status page and other in-house tools.', 60],
    ] as const
  ).map(([projectName, description, days], i) => ({
    projectId: i + 1,
    projectName,
    description,
    createdAt: ago(days),
    updatedAt: ago(days),
  }))

const NGINX_V1 = `server {
    listen 443 ssl http2;
    server_name acme.dev;

    location / {
        proxy_pass http://10.0.4.12:3000;
    }
}
`
const NGINX_V2 = `server {
    listen 443 ssl http2;
    server_name acme.dev www.acme.dev;

    location / {
        proxy_pass http://10.0.4.12:3000;
        proxy_set_header Host $host;
    }
}
`
const NGINX_V3 = `server {
    listen 443 ssl http2;
    server_name acme.dev www.acme.dev;

    add_header Strict-Transport-Security "max-age=31536000" always;

    location / {
        proxy_pass http://10.0.4.20:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /healthz {
        access_log off;
        return 200;
    }
}
`
const APP_YAML = (env: string, replicas: number) => `service: payments-api
environment: ${env}
http:
  port: 8080
  read_timeout: 15s
replicas: ${replicas}
features:
  instant_payouts: ${env === 'production'}
  new_risk_engine: false
`
const COMPOSE = `services:
  api:
    image: ghcr.io/acme/payments-api:2.14.1
    env_file: .env
    ports:
      - "8080:8080"
    restart: unless-stopped
  worker:
    image: ghcr.io/acme/payments-worker:2.14.1
    env_file: .env
    restart: unless-stopped
`
const WORKER_TOML = `[queue]
name = "payouts"
prefetch = 16

[retry]
max_attempts = 5
backoff = "exponential"
`
const DATASOURCES = `apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus.internal:9090
    isDefault: true
`

/** [projectId, fileName, tagId, versions as [content, daysAgo, by, note]] */
const CONFIG_ROWS: Array<[number, string, number, Array<[string, number, string, string]>]> = [
  [
    1,
    'app.yaml',
    1,
    [
      [APP_YAML('production', 3), 150, 'Neko Nik', 'Initial'],
      [APP_YAML('production', 4), 25, 'Priya Rao', 'One more replica'],
    ],
  ],
  [1, 'app.yaml', 2, [[APP_YAML('staging', 1), 150, 'Marcus Chen', 'Initial']]],
  [1, 'docker-compose.yml', 1, [[COMPOSE, 60, 'Marcus Chen', 'Initial']]],
  [1, 'worker.toml', 1, [[WORKER_TOML, 90, 'Aisha Bello', 'Initial']]],
  [
    2,
    'nginx.conf',
    1,
    [
      [NGINX_V1, 140, 'Marcus Chen', 'Initial'],
      [NGINX_V2, 70, 'Marcus Chen', 'Serve www too'],
      [NGINX_V3, 9, 'Marcus Chen', 'HSTS, health check, new origin'],
    ],
  ],
  [4, 'datasources.yaml', 4, [[DATASOURCES, 55, 'Olivia Hart', 'Initial']]],
]

const bytes = (text: string) => new TextEncoder().encode(text).length

const seedConfigs = (): StoredConfig[] =>
  CONFIG_ROWS.map(([projectId, fileName, tagId, rows], i) => {
    const versions: ConfigVersion[] = rows.map(([content, days, createdBy, note], v) => ({
      version: v + 1,
      content,
      sizeBytes: bytes(content),
      createdAt: ago(days),
      createdBy,
      note,
    }))
    const latest = versions.at(-1)!
    return {
      fileId: i + 1,
      projectId,
      fileName,
      tagId,
      versions,
      currentVersion: latest.version,
      latestVersion: latest.version,
      sizeBytes: latest.sizeBytes,
      updatedAt: latest.createdAt,
      updatedBy: latest.createdBy,
    }
  })

const RUNBOOK_V1 = `When the payments API pages:
1. Check the Overview dashboard for web-1 / web-2.
2. Look at Stripe status.
3. Escalate to Priya.`
const RUNBOOK_V3 = `When the payments API pages:

1. Check the Overview dashboard for web-1 / web-2 and db-primary.
2. Look at https://status.stripe.com.
3. If webhooks are backing up, scale the worker (CONCURRENCY in Vault → payments-api).
4. Still stuck after 15 minutes? Call Priya, then Marcus.

Post-incident: write it up in #incidents within 24 hours.`

const user = (id: number) => adminDb.users.find((u) => u.userId === id)!

const seedNotes = (): StoredNote[] => [
  {
    noteId: 1,
    projectId: 1,
    ownerId: 2,
    createdAt: ago(120),
    shares: [
      { userId: 1, displayName: user(1).displayName, canEdit: true },
      { userId: 3, displayName: user(3).displayName, canEdit: true },
      { userId: 4, displayName: user(4).displayName, canEdit: false },
    ],
    links: [],
    versions: [
      { version: 1, title: 'On-call runbook', content: RUNBOOK_V1, createdAt: ago(120), createdBy: 'Priya Rao', note: '' },
      {
        version: 2,
        title: 'On-call runbook',
        content: RUNBOOK_V1.replace('Stripe status.', 'https://status.stripe.com.'),
        createdAt: ago(60),
        createdBy: 'Marcus Chen',
        note: '',
      },
      {
        version: 3,
        title: 'On-call runbook',
        content: RUNBOOK_V3,
        createdAt: ago(6),
        createdBy: 'Priya Rao',
        note: 'Worker scaling step',
      },
    ],
  },
  {
    noteId: 2,
    projectId: 1,
    ownerId: 1,
    createdAt: ago(90),
    shares: [{ userId: 2, displayName: user(2).displayName, canEdit: false }],
    links: [],
    versions: [
      {
        version: 1,
        title: 'Break-glass DB access',
        content:
          'Emergency superuser for db-primary:\n\nuser: break_glass\npassword: 9#tQ!x2Lr7$wPz\n\nUse only during a declared incident. Rotate right after.',
        createdAt: ago(90),
        createdBy: 'Neko Nik',
        note: '',
      },
    ],
  },
  {
    noteId: 3,
    projectId: 2,
    ownerId: 6,
    createdAt: ago(20),
    shares: [{ userId: 1, displayName: user(1).displayName, canEdit: false }],
    links: [
      { shareId: 'k8Qz2LmV', url: '', hasPassword: false, expiresAt: moment().add(5, 'days').toISOString(), createdAt: ago(2) },
    ],
    versions: [
      {
        version: 1,
        title: 'CDN cutover checklist',
        content:
          '- [x] Lower DNS TTL to 60s\n- [x] Warm the new CDN cache\n- [ ] Switch the apex record\n- [ ] Watch error rates for 30 minutes\n- [ ] Raise the TTL back to 3600s',
        createdAt: ago(20),
        createdBy: 'Lena Fischer',
        note: '',
      },
      {
        version: 2,
        title: 'CDN cutover checklist',
        content:
          '- [x] Lower DNS TTL to 60s\n- [x] Warm the new CDN cache\n- [x] Switch the apex record\n- [ ] Watch error rates for 30 minutes\n- [ ] Raise the TTL back to 3600s',
        createdAt: ago(2),
        createdBy: 'Lena Fischer',
        note: 'Apex switched',
      },
    ],
  },
  {
    noteId: 4,
    projectId: 3,
    ownerId: 10,
    createdAt: ago(45),
    shares: [{ userId: 8, displayName: user(8).displayName, canEdit: true }],
    links: [],
    versions: [
      {
        version: 1,
        title: 'Vendor contacts',
        content:
          'Postmark (email): support@postmarkapp.com, account #88412\nDocRaptor (PDF): help@docraptor.com\nAccountant: Meera — +91 98450 00000',
        createdAt: ago(45),
        createdBy: 'Sara Lindqvist',
        note: '',
      },
    ],
  },
  {
    // Priya's own note in payments-api, not shared: the signed-in user can't see it
    noteId: 5,
    projectId: 1,
    ownerId: 2,
    createdAt: ago(10),
    shares: [],
    links: [],
    versions: [
      {
        version: 1,
        title: "Priya's interview notes",
        content: 'Candidate feedback for the SRE role. Private.',
        createdAt: ago(10),
        createdBy: 'Priya Rao',
        note: '',
      },
    ],
  },
]

/** Everything the vault mock holds. */
interface VaultState {
  projects: VaultProject[]
  configs: StoredConfig[]
  notes: StoredNote[]
  nextId: { project: number; config: number; note: number }
}

/** `withSamples` fills in the sample projects, keys, files and notes (tests only). */
const createState = (withSamples: boolean): VaultState => {
  const state: VaultState = {
    projects: withSamples ? seedProjects() : [],
    configs: withSamples ? seedConfigs() : [],
    notes: withSamples ? seedNotes() : [],
    nextId: { project: 5, config: 0, note: 0 },
  }
  state.nextId.config = state.configs.length + 1
  state.nextId.note = state.notes.length + 1
  return state
}

/**
 * The live vault store, mutated by ../api/*.ts. The app starts it empty: projects come from the
 * API, and Env keys, Conf files and Notes added in the UI live here until reload.
 */
export let vaultDb: VaultState = createState(false)

/** Fresh sample data; tests call this so each one starts from the same state. */
export const resetVaultMock = () => {
  vaultDb = createState(true)
}

/**
 * Records real projects fetched from the API, so audit labels and note paths show their names.
 * Updates the name of a project already known.
 */
export const rememberProjects = (projects: VaultProject[]) => {
  for (const project of projects) {
    const known = vaultDb.projects.find((p) => p.projectId === project.projectId)
    if (known) Object.assign(known, project)
    else vaultDb.projects.push({ ...project })
  }
}

/** Display name of the person the mock treats as signed in (the Admin mock's first user). */
export const me = () => adminDb.users[0]!

/** Size of a text in bytes (UTF-8). */
export const byteSize = bytes
