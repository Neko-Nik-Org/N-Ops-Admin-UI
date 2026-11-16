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

/** Flicker-free loading flag for spinners and skeletons. */

import { useEffect, useRef, useState } from 'react'

/**
 * Avoids loader flicker.
 * - Shows nothing for fast loads (under `delay` ms).
 * - Once shown, keeps the loader up for at least `minDuration` ms so it never flashes.
 */
export function useDelayedLoading(loading: boolean, { delay = 200, minDuration = 500 } = {}): boolean {
  const [show, setShow] = useState(false)
  const shownAt = useRef(0)

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined
    if (loading && !show) {
      t = setTimeout(() => {
        shownAt.current = Date.now()
        setShow(true)
      }, delay)
    } else if (!loading && show) {
      const left = Math.max(0, minDuration - (Date.now() - shownAt.current))
      t = setTimeout(() => setShow(false), left)
    }
    return () => {
      if (t) clearTimeout(t)
    }
  }, [loading, show, delay, minDuration])

  return show
}
