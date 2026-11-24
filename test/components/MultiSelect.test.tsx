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
/** Tests for src/components/MultiSelect.tsx. */

import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { MultiSelect } from '@/components/MultiSelect'
import { COUNTRY_OPTIONS } from '@/constants/countries'

const OPTIONS = [
  { value: 'DE', label: 'Germany' },
  { value: 'IN', label: 'India' },
  { value: 'US', label: 'United States' },
]

const Harness = ({ start = [] as string[] }) => {
  const [value, setValue] = useState(start)
  return (
    <>
      <label htmlFor="c">Countries</label>
      <MultiSelect id="c" options={OPTIONS} value={value} onChange={setValue} />
      <output data-testid="value">{value.join(',')}</output>
    </>
  )
}

const box = () => screen.getByRole('combobox', { name: 'Countries' })
const value = () => screen.getByTestId('value').textContent

describe('MultiSelect', () => {
  it('lists every country without typing, Z included', () => {
    render(
      <>
        <label htmlFor="all">All countries</label>
        <MultiSelect id="all" options={COUNTRY_OPTIONS} value={[]} onChange={() => {}} />
      </>,
    )
    fireEvent.focus(screen.getByRole('combobox', { name: 'All countries' }))
    expect(screen.getAllByRole('option')).toHaveLength(COUNTRY_OPTIONS.length)
    expect(COUNTRY_OPTIONS.length).toBeGreaterThan(240)
    expect(screen.getByRole('option', { name: /^Zimbabwe/ })).toBeInTheDocument()
  })

  it('filters by name or exact code and toggles options', () => {
    render(<Harness />)
    fireEvent.change(box(), { target: { value: 'in' } })
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['India IN'])
    fireEvent.click(screen.getByRole('option', { name: /India/ }))
    expect(value()).toBe('IN')
    fireEvent.change(box(), { target: { value: 'us' } })
    expect(screen.getByRole('option', { name: /United States/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('option', { name: /United States/ }))
    expect(value()).toBe('IN,US')
    // picking a chosen option again removes it
    fireEvent.click(screen.getByRole('option', { name: /India/ }))
    expect(value()).toBe('US')
  })

  it('works from the keyboard without submitting a form', () => {
    let submitted = false
    render(
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submitted = true
        }}
      >
        <Harness />
      </form>,
    )
    fireEvent.focus(box())
    fireEvent.keyDown(box(), { key: 'ArrowDown' })
    fireEvent.keyDown(box(), { key: 'Enter' })
    expect(value()).toBe('IN')
    expect(submitted).toBe(false)
    fireEvent.keyDown(box(), { key: 'Backspace' })
    expect(value()).toBe('')
    fireEvent.keyDown(box(), { key: 'Escape' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('removes a chip with its button and says when nothing matches', () => {
    render(<Harness start={['DE']} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove Germany' }))
    expect(value()).toBe('')
    fireEvent.change(box(), { target: { value: 'zzz' } })
    expect(screen.getByText('No matches')).toBeInTheDocument()
  })
})
