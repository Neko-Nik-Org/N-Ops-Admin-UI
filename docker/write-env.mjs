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

// Runs on every container start (see Dockerfile): turns the container's environment into
// dist/env.js, which index.html loads before the app. This is what lets docker-compose set the
// config at run time instead of baking it into the image at build time.
import { writeFileSync } from 'node:fs'

/** Settings copied from the environment into env.js; all are required. */
const keys = ['API_BASE_URL', 'TURNSTILE_SITE_KEY']
/** Output path; the Dockerfile passes /app/dist/env.js. */
const out = process.argv[2] ?? '/app/dist/env.js'

const config = {}
const missing = []
/** Collect the values, trimming the API URL's trailing slashes. */
for (const key of keys) {
  const value = (process.env[key] ?? '').trim()
  if (value) config[key] = key === 'API_BASE_URL' ? value.replace(/\/+$/, '') : value
  else missing.push(key)
}

if (missing.length) {
  // fail fast: a container without its config would only show a blank page
  console.error(`[admin-ui] missing required environment variables: ${missing.join(', ')}`)
  process.exit(1)
}

// JSON.stringify keeps any quotes or special characters in the values safe inside the script
writeFileSync(out, `window.__NOPS_ENV__ = ${JSON.stringify(config)}\n`)
console.log(`[admin-ui] wrote ${out} (API_BASE_URL=${config.API_BASE_URL})`)
