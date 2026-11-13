// Runs on every container start (see Dockerfile): turns the container's environment into
// dist/env.js, which index.html loads before the app. This is what lets docker-compose set the
// config at run time instead of baking it into the image at build time.
import { writeFileSync } from 'node:fs'

const keys = ['API_BASE_URL', 'TURNSTILE_SITE_KEY']
const out = process.argv[2] ?? '/app/dist/env.js'

const config = {}
const missing = []
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
