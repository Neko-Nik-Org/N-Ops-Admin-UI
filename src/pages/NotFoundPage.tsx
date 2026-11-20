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

/** 404 page for any unknown URL. */

import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'

/** "Page doesn't exist" message with a link back to the dashboard. */
export const NotFoundPage = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-ink px-4 text-center">
    <h1 className="font-mono text-7xl leading-none font-bold tracking-tight text-text sm:text-8xl">404</h1>
    <p className="mt-2 text-lg text-text">This page doesn't exist.</p>
    <Link to={ROUTES.overview} className="text-sm text-signal hover:text-signal-strong">
      Back to N-Ops
    </Link>
  </div>
)
