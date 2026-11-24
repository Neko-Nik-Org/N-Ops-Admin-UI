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
/** "Back" that returns to the page the user came from inside the app, else to a fallback page. */

import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * Returns a function that goes back one step in the app's history when this page was reached from
 * another page of the app, and otherwise (opened from a bookmark, a typed URL or a new tab) goes to
 * `fallback`, replacing this entry so Back doesn't bounce between the two.
 */
export const useGoBack = (fallback: string) => {
  const navigate = useNavigate()
  // React Router gives the first page of a visit the key "default"; later in-app pages get their own
  const cameFromApp = useLocation().key !== 'default'
  return useCallback(() => {
    if (cameFromApp) navigate(-1)
    else navigate(fallback, { replace: true })
  }, [cameFromApp, fallback, navigate])
}
