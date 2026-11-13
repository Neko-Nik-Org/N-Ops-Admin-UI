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
export default defineConfig(({ mode }) => ({
  /** React (with Fast Refresh) and Tailwind CSS v4 */
  plugins: [react(), tailwindcss()],
  /** `@/...` imports resolve to src/ */
  resolve: {
    alias: {
      '@': path.resolve(projectRoot, './src'),
    },
  },
  server: {
    port: 5173,
    // extra dev-server hostnames (comma-separated), e.g. when tunnelling: DEV_ALLOWED_HOSTS=dev.example.com
    allowedHosts: [
      'localhost',
      ...(loadEnv(mode, projectRoot, '').DEV_ALLOWED_HOSTS ?? '')
        .split(',')
        .map((h) => h.trim())
        .filter(Boolean),
    ],
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        /** Split large libraries into separate, long-cacheable chunks. */
        manualChunks(id: string) {
          if (id.includes('recharts')) return 'charts'
          if (id.includes('@tanstack') || id.includes('axios')) return 'query'
          if (id.includes('node_modules/react') || id.includes('react-router-dom')) return 'vendor'
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
}))
