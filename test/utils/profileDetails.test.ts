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
/** Tests for src/utils/profileDetails.ts: the structure of `user_details`. */

import { describe, expect, it } from 'vitest'
import {
  describeSshKey,
  emptyProfileDetails,
  isProfileDetailsEmpty,
  parseProfileDetails,
  serializeProfileDetails,
} from '@/utils/profileDetails'

describe('profile details', () => {
  it('round-trips the structure, leaving out empty values', () => {
    const saved = {
      version: 1,
      work: { job_title: 'SRE', employee_id: 'E-7' },
      availability: { timezone: 'UTC', working_hours: { start: '09:00' }, working_days: ['fri', 'mon'] },
      contact: { phone: '+1 555 0100' },
      custom: { Pronouns: 'she/her' },
    }
    const { details, preserved } = parseProfileDetails(saved)
    expect(preserved).toEqual({})
    expect(details.availability.workDays).toEqual(['fri', 'mon'])
    expect(serializeProfileDetails(details)).toEqual({
      ...saved,
      availability: { timezone: 'UTC', working_hours: { start: '09:00' }, working_days: ['mon', 'fri'] }, // week order
    })
  })

  it('reads free-form details from before: known labels move, other text goes to custom, the rest is kept', () => {
    const { details, preserved } = parseProfileDetails({ 'Job title': 'Dev', team: 'Core', Pets: 'cat', on_call: true, n: 3 })
    expect(details.work).toMatchObject({ jobTitle: 'Dev', department: 'Core' })
    expect(details.custom).toEqual([{ label: 'Pets', value: 'cat' }])
    expect(preserved).toEqual({ on_call: true, n: 3 })
    expect(serializeProfileDetails(details, preserved)).toEqual({
      on_call: true,
      n: 3,
      version: 1,
      work: { job_title: 'Dev', department: 'Core' },
      custom: { Pets: 'cat' },
    })
  })

  it('keeps on-call and emergency-contact values saved before those sections were removed', () => {
    const old = { on_call: { phone: '+1 555 0100' }, emergency_contact: { name: 'Sam' } }
    const { details, preserved } = parseProfileDetails(old)
    expect(preserved).toEqual(old)
    expect(serializeProfileDetails(details, preserved)).toEqual({ ...old, version: 1 })
  })

  it('ignores values of the wrong type inside a group', () => {
    const { details } = parseProfileDetails({ work: { job_title: 7 }, availability: { working_days: ['mon', 'funday', 3] } })
    expect(details.work.jobTitle).toBe('')
    expect(details.availability.workDays).toEqual(['mon'])
  })

  it('knows when nothing is filled in', () => {
    expect(isProfileDetailsEmpty(emptyProfileDetails())).toBe(true)
    expect(serializeProfileDetails(emptyProfileDetails())).toEqual({ version: 1 })
  })

  it('shortens an SSH key for display', () => {
    expect(describeSshKey('ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMq priya@laptop work')).toEqual({
      type: 'ssh-ed25519',
      short: 'AAAAC3Nz…AAAAIOMq',
      comment: 'priya@laptop work',
    })
  })
})
