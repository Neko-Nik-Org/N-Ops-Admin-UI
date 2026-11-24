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
 * Low-power mode for older or weaker machines. Decorative motion is what costs CPU when nothing
 * else is happening, so on such devices it is turned off: the sign-in background is drawn once
 * instead of animated, glass blur becomes a solid panel, and looping decorations stop.
 *
 * A device counts as low-power when it has 4 or fewer CPU threads, reports 4 GB of memory or less,
 * has the browser's data saver on, or the person asked their system for reduced motion.
 */

interface DeviceHints {
  deviceMemory?: number
  connection?: { saveData?: boolean }
}

const detect = (): boolean => {
  if (typeof window === 'undefined') return false
  const nav = navigator as Navigator & DeviceHints
  return (
    (nav.hardwareConcurrency || 8) <= 4 ||
    (nav.deviceMemory ?? 8) <= 4 ||
    nav.connection?.saveData === true ||
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  )
}

/** True on devices where decorative motion is switched off. Decided once, at startup. */
export const LOW_POWER = detect()

/** Marks the page (`<html data-low-power>`) so the stylesheets can drop costly effects too. */
export const applyLowPowerMode = () => {
  if (LOW_POWER) document.documentElement.dataset.lowPower = ''
}
