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
/** The explorer's selected item, kept in the URL (`?item=12`) so it survives reloads and history. */

import { useSearchParams } from 'react-router-dom'

export const useSelectedItem = (): [number | null, (id: number | null) => void] => {
  const [params, setParams] = useSearchParams()
  const raw = params.get('item')
  const id = raw !== null && /^\d+$/.test(raw) ? Number(raw) : null
  const select = (next: number | null) =>
    setParams(
      (prev) => {
        const out = new URLSearchParams(prev)
        if (next === null) out.delete('item')
        else out.set('item', String(next))
        return out
      },
      { replace: true },
    )
  return [id, select]
}
