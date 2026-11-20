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
/** Tests for src/lib/toastLayer.ts: toasts are moved to the front of the top layer. */

import { describe, expect, it, vi } from 'vitest'
import { raiseToasts, setToastLayer } from '@/lib/toastLayer'

/** A popover element with the browser API stubbed (jsdom has none). */
const fakePopover = () => {
  const el = document.createElement('div')
  let open = false
  el.showPopover = vi.fn(() => void (open = true))
  el.hidePopover = vi.fn(() => void (open = false))
  el.matches = ((selector: string) => selector === ':popover-open' && open) as typeof el.matches
  return el
}

describe('toastLayer', () => {
  it('shows the toast popover when registered, and re-shows it to come to the front', () => {
    const el = fakePopover()
    setToastLayer(el)
    expect(el.showPopover).toHaveBeenCalledTimes(1)
    expect(el.hidePopover).not.toHaveBeenCalled()

    raiseToasts() // e.g. a dialog just opened above it
    expect(el.hidePopover).toHaveBeenCalledTimes(1)
    expect(el.showPopover).toHaveBeenCalledTimes(2)
    setToastLayer(null)
  })

  it('does nothing without popover support', () => {
    setToastLayer(document.createElement('div'))
    expect(() => raiseToasts()).not.toThrow()
    setToastLayer(null)
  })
})
