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
/** Tests for src/components/molecules/DropdownMenu.tsx: the menu opens where it fits. */

import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DropdownMenu } from '@/components/molecules/DropdownMenu'

/** Puts the trigger at `top`–`top + 30` px in an 800 px tall window, with a 150 px tall menu. */
const layout = (top: number) => {
  vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800)
  vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1200)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    top,
    bottom: top + 30,
    left: 1000,
    right: 1040,
    width: 40,
    height: 30,
    x: 1000,
    y: top,
    toJSON: () => ({}),
  })
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(150)
}

const renderMenu = (floating: boolean) =>
  render(
    <DropdownMenu label="Edit row" menuLabel="Edit" trigger="Edit" floating={floating} chevron={false}>
      <button type="button" role="menuitem">
        One
      </button>
    </DropdownMenu>,
  )

afterEach(() => vi.restoreAllMocks())

describe('DropdownMenu', () => {
  it('opens a floating menu below the trigger when it fits', () => {
    layout(100)
    renderMenu(true)
    fireEvent.click(screen.getByRole('button', { name: 'Edit row' }))
    const menu = screen.getByRole('menu')
    expect(menu.style.position).toBe('fixed')
    expect(menu.style.top).toBe('136px')
    expect(menu.style.bottom).toBe('')
    expect(menu.style.right).toBe('160px')
  })

  it('opens a floating menu above the trigger near the bottom of the window', () => {
    layout(700)
    renderMenu(true)
    fireEvent.click(screen.getByRole('button', { name: 'Edit row' }))
    const menu = screen.getByRole('menu')
    expect(menu.style.top).toBe('')
    expect(menu.style.bottom).toBe('106px') // 800 - 700 + 6
  })

  it('draws a floating menu in <body>, and an item click there still works', () => {
    layout(100)
    const onPick = vi.fn()
    const { container } = render(
      <DropdownMenu label="Edit row" menuLabel="Edit" trigger="Edit" floating>
        <button type="button" role="menuitem" onClick={onPick}>
          One
        </button>
      </DropdownMenu>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Edit row' }))
    const menu = screen.getByRole('menu')
    expect(container.contains(menu)).toBe(false)
    fireEvent.pointerDown(screen.getByRole('menuitem', { name: 'One' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'One' }))
    expect(onPick).toHaveBeenCalled()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('closes a floating menu when the page scrolls, but not when the menu itself scrolls', () => {
    layout(100)
    renderMenu(true)
    fireEvent.click(screen.getByRole('button', { name: 'Edit row' }))
    fireEvent.scroll(screen.getByRole('menu'))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    fireEvent.scroll(window)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('flips an anchored menu upward too', () => {
    layout(700)
    renderMenu(false)
    fireEvent.click(screen.getByRole('button', { name: 'Edit row' }))
    expect(screen.getByRole('menu').style.bottom).toBe('100%')
  })
})
