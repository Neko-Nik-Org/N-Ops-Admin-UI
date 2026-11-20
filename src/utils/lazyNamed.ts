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
 * Code-splitting helpers for heavy pieces of a page, such as form dialogs (react-hook-form and yup):
 * the page renders without them, and they download when first needed or while the browser is idle.
 */

import { lazy, useEffect, type ComponentType } from 'react'

/** A lazy component for the named export `name` of the module `load` imports, plus `preload()`. */
export const lazyNamed = <K extends string, P extends object>(load: () => Promise<Record<K, ComponentType<P>>>, name: K) =>
  Object.assign(
    lazy(() => load().then((m) => ({ default: m[name] }))),
    { preload: () => void load().catch(() => {}) },
  )

/** Calls each `preload` once the page has settled, so opening a dialog later doesn't wait on the network. */
export const usePreloadWhenIdle = (enabled: boolean, ...preloads: Array<() => void>) => {
  useEffect(() => {
    if (!enabled) return
    const run = () => preloads.forEach((preload) => preload())
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(run, { timeout: 3000 })
      return () => window.cancelIdleCallback(id)
    }
    const id = setTimeout(run, 1500)
    return () => clearTimeout(id)
    // the preload functions are module-level and never change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])
}
