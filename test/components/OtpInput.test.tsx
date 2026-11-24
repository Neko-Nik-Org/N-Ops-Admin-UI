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
/** Tests for src/components/OtpInput.tsx: typing, deleting, moving and pasting a code. */

import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { OtpInput } from '@/components/OtpInput'

/** Holds the value like a real form does. */
const Harness = ({ onComplete, charset }: { onComplete?: (v: string) => void; charset?: 'numeric' | 'alphanumeric' }) => {
  const [value, setValue] = useState('')
  return (
    <>
      <OtpInput value={value} onChange={setValue} onComplete={onComplete} charset={charset} />
      <output data-testid="value">{value}</output>
    </>
  )
}

const box = (n: number) => screen.getByLabelText(new RegExp(`^(Digit|Character) ${n} of 6$`)) as HTMLInputElement
const value = () => screen.getByTestId('value').textContent

describe('OtpInput', () => {
  it('starts in the first box and moves forward as digits are typed', () => {
    render(<Harness />)
    expect(box(1)).toHaveFocus()
    fireEvent.change(box(1), { target: { value: '4' } })
    expect(box(2)).toHaveFocus()
    fireEvent.change(box(2), { target: { value: '2' } })
    expect(value()).toBe('42')
    expect(box(1)).toHaveValue('4')
  })

  it('ignores letters in a numeric code, and keeps them in an alphanumeric one', () => {
    const { unmount } = render(<Harness />)
    fireEvent.change(box(1), { target: { value: 'a' } })
    expect(value()).toBe('')
    unmount()
    render(<Harness charset="alphanumeric" />)
    fireEvent.change(box(1), { target: { value: 'aB' } }) // autofill-sized input fills from here
    expect(value()).toBe('aB')
  })

  it('fills every box from a paste and reports the complete code once', () => {
    const onComplete = vi.fn()
    render(<Harness onComplete={onComplete} />)
    fireEvent.paste(box(1), { clipboardData: { getData: () => ' 123-456 ' } })
    expect(value()).toBe('123456')
    expect(onComplete).toHaveBeenCalledExactlyOnceWith('123456')
    expect(box(6)).toHaveValue('6')
  })

  it('deletes with Backspace: the box itself, or the one before when it is empty', () => {
    render(<Harness />)
    fireEvent.paste(box(1), { clipboardData: { getData: () => '123' } })
    fireEvent.keyDown(box(2), { key: 'Backspace' }) // a filled box: removes its own digit
    expect(value()).toBe('13')
    expect(box(2)).toHaveFocus()
    fireEvent.keyDown(box(3), { key: 'Backspace' }) // an empty box: removes the one before
    expect(value()).toBe('1')
    expect(box(2)).toHaveFocus()
  })

  it('moves with the arrow keys, but not past the first empty box', () => {
    render(<Harness />)
    fireEvent.paste(box(1), { clipboardData: { getData: () => '12' } })
    fireEvent.keyDown(box(3), { key: 'ArrowLeft' })
    expect(box(2)).toHaveFocus()
    fireEvent.keyDown(box(2), { key: 'ArrowRight' })
    fireEvent.keyDown(box(3), { key: 'ArrowRight' })
    expect(box(3)).toHaveFocus()
  })

  it('replaces a digit in the middle when typed over', () => {
    render(<Harness />)
    fireEvent.paste(box(1), { clipboardData: { getData: () => '1234' } })
    fireEvent.change(box(2), { target: { value: '9' } })
    expect(value()).toBe('1934')
    expect(box(3)).toHaveFocus()
  })
})
