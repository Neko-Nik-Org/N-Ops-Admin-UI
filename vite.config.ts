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

/** Vite configuration for the dev server, production build and Vitest. */

import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

const projectRoot = import.meta.dirname

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // extra hostnames (comma-separated) for the dev and preview servers, e.g. when tunnelling: DEV_ALLOWED_HOSTS=dev.example.com
  const allowedHosts = [
    'localhost',
    ...(loadEnv(mode, projectRoot, '').DEV_ALLOWED_HOSTS ?? '')
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean),
  ]

  return {
    /** React (with Fast Refresh) and Tailwind CSS v4 */
    plugins: [react(), tailwindcss()],
    /** `@/...` imports resolve to src/ */
    resolve: {
      alias: {
        '@': path.resolve(projectRoot, './src'),
      },
    },
    server: { port: 5173, allowedHosts },
    /** `npm run preview`: serves the production build (dist/), the one to measure with Lighthouse */
    preview: { port: 5173, allowedHosts },
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          /** Split large libraries into separate, long-cacheable chunks. */
          // Only what every page needs goes in these two. Exact package names matter: a loose
          // `node_modules/react` match also swallowed react-hook-form and others into the first load.
          manualChunks(id: string) {
            if (/node_modules\/(@tanstack\/(react-)?query-core|@tanstack\/react-query|axios)\//.test(id)) return 'query'
            if (/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom)\//.test(id)) return 'vendor'
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      // all tests live in /test, mirroring the src/ structure
      include: ['test/**/*.test.{ts,tsx}'],
      setupFiles: ['test/setup.ts'],
      // https so the session cookies (Secure) behave as in production
      environmentOptions: { jsdom: { url: 'https://localhost/' } },
    },
  }
})
