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
 * Read-only profile details (`user_details`), grouped: work, contact, availability,
 * engineering, and the person's own extra fields. Only what's filled in shows.
 * Used on the Account page and in Admin › Users.
 */

import { BriefcaseBusiness, Clock, Code2, Phone, Tags, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '@/components/atoms/Badge'
import {
  describeSshKey,
  localTimeIn,
  parseProfileDetails,
  WEEKDAY_LABELS,
  WEEKDAYS,
  type ProfileDetails,
} from '@/features/account/profileDetails'
import type { JsonObject } from '@/features/account/types'

type Row = [label: string, value: ReactNode]

const Section = ({ icon: Icon, title, rows }: { icon: LucideIcon; title: string; rows: Row[] }) => {
  const shown = rows.filter(([, v]) => v !== '' && v !== null && v !== undefined && v !== false)
  if (!shown.length) return null
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <h3 className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-text-muted uppercase">
        <Icon size={13} aria-hidden="true" />
        {title}
      </h3>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
        {shown.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-text-muted">{label}</dt>
            <dd className="break-words text-text">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/** "Mon–Fri", or "Mon, Wed, Fri". */
const describeDays = (days: ProfileDetails['availability']['workDays']) => {
  const idx = WEEKDAYS.map((d) => days.includes(d))
  const first = idx.indexOf(true)
  const last = idx.lastIndexOf(true)
  if (first >= 0 && last - first + 1 === days.length && days.length > 2)
    return `${WEEKDAY_LABELS[WEEKDAYS[first]!]}–${WEEKDAY_LABELS[WEEKDAYS[last]!]}`
  return WEEKDAYS.filter((d) => days.includes(d))
    .map((d) => WEEKDAY_LABELS[d])
    .join(', ')
}

const show = (value: unknown) => (value === null ? 'null' : typeof value === 'string' ? value : JSON.stringify(value))

export const ProfileDetailsView = ({ raw }: { raw: JsonObject }) => {
  const { details: d, preserved } = parseProfileDetails(raw)
  const { availability: a, engineering: e } = d
  const hours = a.workStart && a.workEnd ? `${a.workStart}–${a.workEnd}` : a.workStart || a.workEnd
  const localTime = a.timezone ? localTimeIn(a.timezone) : ''
  const extra = [
    ...d.custom.map((c): Row => [c.label, c.value || '—']),
    ...Object.entries(preserved).map(([k, v]): Row => [k.replace(/_/g, ' '), show(v)]),
  ]

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
      <Section
        icon={BriefcaseBusiness}
        title="Work"
        rows={[
          ['Job title', d.work.jobTitle],
          ['Department', d.work.department],
          ['Employee id', d.work.employeeId],
          ['Location', d.work.location],
        ]}
      />
      <Section
        icon={Phone}
        title="Contact"
        rows={[
          ['Phone', d.contact.phone && <a href={`tel:${d.contact.phone.replace(/[^\d+]/g, '')}`}>{d.contact.phone}</a>],
          ['Chat', d.contact.chatHandle],
          [
            'Other email',
            d.contact.alternateEmail && <a href={`mailto:${d.contact.alternateEmail}`}>{d.contact.alternateEmail}</a>,
          ],
        ]}
      />
      <Section
        icon={Clock}
        title="Availability"
        rows={[
          ['Time zone', a.timezone && `${a.timezone}${localTime ? ` (${localTime} there now)` : ''}`],
          ['Hours', hours],
          ['Days', a.workDays.length > 0 && describeDays(a.workDays)],
        ]}
      />
      <Section
        icon={Code2}
        title="Engineering"
        rows={[
          ['GitHub', e.githubUsername && `@${e.githubUsername}`],
          ['GitLab', e.gitlabUsername && `@${e.gitlabUsername}`],
          [
            'Expertise',
            e.expertise.length > 0 && (
              <span className="flex flex-wrap gap-1">
                {e.expertise.map((x) => (
                  <Badge key={x}>{x}</Badge>
                ))}
              </span>
            ),
          ],
          [
            'SSH keys',
            e.sshPublicKeys.length > 0 && (
              <ul className="flex flex-col gap-0.5">
                {e.sshPublicKeys.map((key) => {
                  const k = describeSshKey(key)
                  return (
                    <li key={key} className="font-mono text-xs" title={key}>
                      {k.type} {k.short} <span className="text-text-muted">{k.comment}</span>
                    </li>
                  )
                })}
              </ul>
            ),
          ],
        ]}
      />
      <Section icon={Tags} title="Other" rows={extra} />
    </div>
  )
}
