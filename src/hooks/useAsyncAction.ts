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

/** Async action state for LoadingButton: idle → loading → success. */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ButtonState } from '@/components/LoadingButton'

/**
 * Drives a LoadingButton from an async function: idle → loading → success (for `successMs`) → idle.
 * Errors put the button back to idle and are re-thrown so you can show them.
 *
 *   const [state, approve] = useAsyncAction(() => api.approve(id));
 *   <LoadingButton state={state} onClick={() => approve()} loadingText="Approving" successText="Approved">Approve</LoadingButton>
 */
export function useAsyncAction<A extends unknown[], R>(fn: (...args: A) => Promise<R>, { successMs = 1200 } = {}) {
  const [state, setState] = useState<ButtonState>('idle')
  const alive = useRef(true)
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const run = useCallback(
    async (...args: A): Promise<R> => {
      setState('loading')
      try {
        const result = await fnRef.current(...args)
        if (alive.current) {
          setState('success')
          setTimeout(() => {
            if (alive.current) setState('idle')
          }, successMs)
        }
        return result
      } catch (err) {
        if (alive.current) setState('idle')
        throw err
      }
    },
    [successMs],
  )

  return [state, run] as const
}
