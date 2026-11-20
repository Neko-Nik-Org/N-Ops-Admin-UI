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
/**
 * Keeps toasts above modal dialogs. Dialogs open with showModal(), which puts them in the browser's
 * top layer, above anything a z-index can reach. So the toasts live in a popover, which is in the
 * top layer too, and get moved to the front of it whenever a toast or a dialog appears.
 */

let layer: HTMLElement | null = null

/** Registers the popover holding the toasts and shows it. */
export const setToastLayer = (element: HTMLElement | null) => {
  layer = element
  raiseToasts()
}

/** Brings the toasts in front of everything else in the top layer (re-showing a popover does that). */
export const raiseToasts = () => {
  if (!layer || typeof layer.showPopover !== 'function') return // no popover support (e.g. tests)
  try {
    if (layer.matches(':popover-open')) layer.hidePopover()
    layer.showPopover()
  } catch {
    // not connected yet, or popovers unsupported: toasts just use their normal z-index
  }
}
