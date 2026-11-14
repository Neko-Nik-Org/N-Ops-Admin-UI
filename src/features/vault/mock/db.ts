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
 * In-memory mock of the Vault API. The API has no vault endpoints yet (the /vault/* scopes are
 * commented out in N-Ops-Main-API/src/main.rs), so ../api/*.ts call this. It shares the Admin
 * mock's users, plan limits and audit log, keeps changes until reload, and treats versions as
 * immutable like `vault_secret_key_versions`.
 *
 * Tag ids: 1 production, 2 staging, 3 development, 4 internal.
 * The "Break-glass DB access" note is locked with the password `open-sesame`.
 */

import moment from 'moment'
import { db as adminDb } from '@/features/admin/mock/db'
import type {
  ConfigFile,
  ConfigVersion,
  NoteLink,
  NoteShare,
  NoteVersion,
  SecretKey,
  SecretVersion,
  VaultProject,
  VaultService,
} from '../types'

const ago = (days: number, hours = 0) => moment().subtract(days, 'days').subtract(hours, 'hours').toISOString()

/** A secret with all its versions. */
export interface StoredSecret extends SecretKey {
  versions: SecretVersion[]
}
/** A config file with all its versions. */
export interface StoredConfig extends ConfigFile {
  versions: ConfigVersion[]
}
/** A note with its versions and, if locked, its password. */
export interface StoredNote {
  noteId: number
  projectId: number
  ownerId: number
  password: string | null
  createdAt: string
  shares: NoteShare[]
  links: NoteLink[]
  versions: NoteVersion[]
}

/** Builds version history: `[value, daysAgo, by, note]` oldest first. */
const history = (rows: Array<[string, number, string, string]>): SecretVersion[] =>
  rows.map(([value, days, createdBy, note], i) => ({ version: i + 1, value, createdAt: ago(days), createdBy, note }))

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

const seedServices = (): VaultService[] =>
  (
    [
      [1, 'api', 'Public payments API.'],
      [1, 'worker', 'Payout and webhook queue workers.'],
      [2, 'frontend', 'Next.js app.'],
      [2, 'edge', 'Nginx in front of everything.'],
      [3, 'invoices', 'Invoice generation and email.'],
      [4, 'grafana', 'Dashboards and alerting.'],
    ] as const
  ).map(([projectId, serviceName, description], i) => ({
    serviceId: i + 1,
    projectId,
    serviceName,
    description,
    createdAt: ago(180 - i * 20),
    updatedAt: ago(180 - i * 20),
  }))

/** [serviceId, name, tagId, versions, currentVersion (defaults to latest)] */
type SecretRow = [number, string, number, SecretVersion[], number?]

const SECRET_ROWS = (): SecretRow[] => [
  [
    1,
    'DATABASE_URL',
    1,
    history([
      ['postgres://payments:Xk2v9Qe1@db-primary.internal:5432/payments', 200, 'Neko Nik', 'Initial'],
      ['postgres://payments:Lm8Rt3Zp@db-primary.internal:5432/payments', 95, 'Priya Rao', 'Quarterly rotation'],
      ['postgres://payments:Hd7Wq4Ns@db-primary.internal:5432/payments?sslmode=require', 12, 'Priya Rao', 'Require TLS'],
    ]),
  ],
  [
    1,
    'DATABASE_URL',
    2,
    history([['postgres://payments:staging-pass@db-staging.internal:5432/payments', 150, 'Marcus Chen', 'Initial']]),
  ],
  [1, 'DATABASE_URL', 3, history([['postgres://payments:dev@localhost:5432/payments', 150, 'Tomás Ruiz', 'Initial']])],
  [
    1,
    'STRIPE_SECRET_KEY',
    1,
    history([
      ['sk_live_51Hc2f…old1', 200, 'Neko Nik', 'Initial'],
      ['sk_live_51Hc2f9QpZt4mK2lYv8Rx', 120, 'Priya Rao', 'Rolled after Stripe dashboard change'],
      ['sk_live_51Hc2f7WqLp0dJ6nUe3Ta', 40, 'Priya Rao', 'Rotated after leak drill'],
    ]),
  ],
  [1, 'STRIPE_SECRET_KEY', 2, history([['sk_test_51Hc2fA8bC3dE4fG5hI6j', 150, 'Marcus Chen', 'Initial']])],
  [
    1,
    'JWT_SIGNING_KEY',
    1,
    history([
      ['b64:3q2+7w==9fK1aYp2Lm', 180, 'Neko Nik', 'Initial'],
      ['b64:Zx9!Qw2#Er4$Ty6^Ui8', 3, 'Marcus Chen', 'Rotate signing key'],
    ]),
    1, // rolled back: the new key broke older mobile clients
  ],
  [1, 'LOG_LEVEL', 1, history([['warn', 200, 'Neko Nik', 'Initial']])],
  [
    1,
    'LOG_LEVEL',
    2,
    history([
      ['info', 150, 'Marcus Chen', 'Initial'],
      ['debug', 20, 'Aisha Bello', 'Chasing webhook bug'],
    ]),
  ],
  [2, 'QUEUE_URL', 1, history([['amqps://worker:Vb6Nm2Qa@mq.internal:5671/payouts', 170, 'Neko Nik', 'Initial']])],
  [2, 'SENTRY_DSN', 1, history([['https://4f1c2e@o12345.ingest.sentry.io/678', 170, 'Neko Nik', 'Initial']])],
  [
    2,
    'CONCURRENCY',
    1,
    history([
      ['8', 170, 'Neko Nik', 'Initial'],
      ['16', 30, 'Aisha Bello', 'Black Friday load'],
    ]),
  ],
  [3, 'NEXT_PUBLIC_API_URL', 1, history([['https://api.acme.dev', 160, 'Lena Fischer', 'Initial']])],
  [3, 'NEXT_PUBLIC_API_URL', 2, history([['https://api.staging.acme.dev', 160, 'Lena Fischer', 'Initial']])],
  [3, 'SESSION_SECRET', 1, history([['c1f9a7e3d5b2468f0e9d8c7b6a5f4e3d', 160, 'Lena Fischer', 'Initial']])],
  [4, 'CLOUDFLARE_API_TOKEN', 1, history([['cf_Tk_8e3Qz1Lp6Wv2Ny9', 140, 'Marcus Chen', 'Initial']])],
  [
    4,
    'ORIGIN_HOST',
    1,
    history([
      ['10.0.4.12', 140, 'Marcus Chen', 'Initial'],
      ['10.0.4.20', 9, 'Marcus Chen', 'New origin box'],
    ]),
  ],
  [5, 'SMTP_PASSWORD', 1, history([['Sm7p!Pa55-2026', 100, 'Sara Lindqvist', 'Initial']])],
  [5, 'PDF_RENDERER_URL', 1, history([['http://pdf-renderer.internal:3000', 100, 'Sara Lindqvist', 'Initial']])],
  [6, 'GRAFANA_ADMIN_PASSWORD', 4, history([['gr4f4n4-Adm1n!', 55, 'Olivia Hart', 'Initial']])],
]

const seedSecrets = (): StoredSecret[] =>
  SECRET_ROWS().map(([serviceId, name, tagId, versions, current], i) => {
    const latest = versions.at(-1)!
    return {
      secretId: i + 1,
      serviceId,
      name,
      tagId,
      versions,
      currentVersion: current ?? latest.version,
      latestVersion: latest.version,
      updatedAt: latest.createdAt,
      updatedBy: latest.createdBy,
    }
  })

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

/** [serviceId, fileName, tagId, versions as [content, daysAgo, by, note]] */
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
  [2, 'worker.toml', 1, [[WORKER_TOML, 90, 'Aisha Bello', 'Initial']]],
  [
    4,
    'nginx.conf',
    1,
    [
      [NGINX_V1, 140, 'Marcus Chen', 'Initial'],
      [NGINX_V2, 70, 'Marcus Chen', 'Serve www too'],
      [NGINX_V3, 9, 'Marcus Chen', 'HSTS, health check, new origin'],
    ],
  ],
  [6, 'datasources.yaml', 4, [[DATASOURCES, 55, 'Olivia Hart', 'Initial']]],
]

const bytes = (text: string) => new TextEncoder().encode(text).length

const seedConfigs = (): StoredConfig[] =>
  CONFIG_ROWS.map(([serviceId, fileName, tagId, rows], i) => {
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
      serviceId,
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
3. If webhooks are backing up, scale the worker (CONCURRENCY in Vault → payments-api/worker).
4. Still stuck after 15 minutes? Call Priya, then Marcus.

Post-incident: write it up in #incidents within 24 hours.`

const user = (id: number) => adminDb.users.find((u) => u.userId === id)!

const seedNotes = (): StoredNote[] => [
  {
    noteId: 1,
    projectId: 1,
    ownerId: 2,
    password: null,
    createdAt: ago(120),
    shares: [
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
    password: 'open-sesame',
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
    password: null,
    createdAt: ago(20),
    shares: [],
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
    password: null,
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
]

/** Everything the vault mock holds. */
interface VaultState {
  projects: VaultProject[]
  services: VaultService[]
  secrets: StoredSecret[]
  configs: StoredConfig[]
  notes: StoredNote[]
  nextId: { project: number; service: number; secret: number; config: number; note: number }
}

const createState = (): VaultState => {
  const state: VaultState = {
    projects: seedProjects(),
    services: seedServices(),
    secrets: seedSecrets(),
    configs: seedConfigs(),
    notes: seedNotes(),
    nextId: { project: 5, service: 7, secret: 0, config: 0, note: 5 },
  }
  state.nextId.secret = state.secrets.length + 1
  state.nextId.config = state.configs.length + 1
  return state
}

/** The live vault mock. Mutated by ../api/*.ts. */
export let vaultDb: VaultState = createState()

/** Fresh seed data; tests call this so each one starts from the same state. */
export const resetVaultMock = () => {
  vaultDb = createState()
}

/** Display name of the person the mock treats as signed in (the Admin mock's first user). */
export const me = () => adminDb.users[0]!

/** Size of a text in bytes (UTF-8). */
export const byteSize = bytes
