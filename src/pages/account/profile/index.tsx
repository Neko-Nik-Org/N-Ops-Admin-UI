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
/** Account › Profile (/account/profile): name, username and email, profile details and preferences. */

import { PageHeader } from '@/components/PageHeader'
import { PreferencesCard } from '@/pages/account/PreferencesCard'
import { ProfileDetailsCard } from '@/pages/account/ProfileDetailsCard'
import { UserDetailsCard } from '@/pages/account/UserDetailsCard'

export const AccountProfilePage = () => (
  <div className="flex flex-col gap-4">
    <PageHeader title="Profile" />
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
      <UserDetailsCard className="lg:col-span-2" />
      <PreferencesCard />
      <ProfileDetailsCard className="lg:col-span-3" />
    </div>
  </div>
)
