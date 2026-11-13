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

/** Account page (/account): profile, preferences and organization quotas. */

import { OrgInfoCard } from '@/components/organisms/OrgInfoCard'
import { UserDetailsCard } from '@/components/organisms/UserDetailsCard'
import { ThemeToggle } from '@/components/molecules/ThemeToggle'

/** Two-column layout: profile and preferences on the left, organization info on the right. */
export const AccountPage = () => (
  <div className="flex flex-col gap-6">
    <div>
      <h1 className="text-2xl font-bold text-text">Account</h1>
      <p className="text-sm text-text-muted">Your profile, preferences and your organization's quotas.</p>
    </div>

    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
      <div className="flex flex-col gap-4">
        <UserDetailsCard />
        <section className="rounded-xl border border-border bg-surface-raised p-5">
          <h2 className="mb-1 font-semibold text-text">Preferences</h2>
          <p className="mb-4 text-sm text-text-muted">Saved to your account, so they follow you to other devices.</p>
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-text">Theme</span>
            <ThemeToggle />
          </div>
        </section>
      </div>
      <OrgInfoCard />
    </div>
  </div>
)
