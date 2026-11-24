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
/** Tests for src/utils/lowPower.ts: which devices skip decorative motion. */

import { afterEach, describe, expect, it, vi } from 'vitest'

/** Loads the module fresh with the given device hints (it decides once, on import). */
const load = async (hints: { cores?: number; memory?: number; saveData?: boolean; reducedMotion?: boolean }) => {
  vi.resetModules()
  vi.stubGlobal('navigator', {
    ...navigator,
    hardwareConcurrency: hints.cores ?? 8,
    deviceMemory: hints.memory,
    connection: hints.saveData === undefined ? undefined : { saveData: hints.saveData },
  })
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) => ({ matches: query.includes('reduce') && !!hints.reducedMotion }) as MediaQueryList,
  )
  return import('@/utils/lowPower')
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  delete document.documentElement.dataset.lowPower
})

describe('lowPower', () => {
  it('stays off on a capable machine', async () => {
    const { LOW_POWER, applyLowPowerMode } = await load({ cores: 8, memory: 8 })
    expect(LOW_POWER).toBe(false)
    applyLowPowerMode()
    expect(document.documentElement.dataset.lowPower).toBeUndefined()
  })

  it.each([
    ['4 or fewer CPU threads', { cores: 4 }],
    ['4 GB of memory or less', { memory: 4 }],
    ['data saver', { saveData: true }],
    ['reduced motion', { reducedMotion: true }],
  ])('turns on for %s, and marks the page', async (_label, hints) => {
    const { LOW_POWER, applyLowPowerMode } = await load(hints)
    expect(LOW_POWER).toBe(true)
    applyLowPowerMode()
    expect(document.documentElement.dataset.lowPower).toBe('')
  })
})
