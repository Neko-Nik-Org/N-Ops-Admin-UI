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
/** Users in the organization (CRUD). Mock until `/user/admin/*` is live. */

import { clone, db, mockDelay, notFound, recordAudit } from '../mock/db'
import type { AdminUser, AdminUserInput } from '../types'

const findUser = (userId: number) => db.users.find((u) => u.userId === userId) ?? notFound('user')

/** Rejects a username or email another user already has (both are unique in `app_user`). */
const assertUnique = (input: AdminUserInput, exceptId?: number) => {
  const others = db.users.filter((u) => u.userId !== exceptId)
  if (others.some((u) => u.userName.toLowerCase() === input.userName.toLowerCase())) {
    throw new Error(`The username "${input.userName}" is already taken.`)
  }
  if (others.some((u) => u.primaryEmail.toLowerCase() === input.primaryEmail.toLowerCase())) {
    throw new Error(`${input.primaryEmail} already belongs to another user.`)
  }
  if (!db.roles.some((r) => r.roleId === input.roleId)) throw new Error('Pick a role.')
}

/** Future: `GET /user/admin/list`. */
export const listUsers = async (): Promise<AdminUser[]> => {
  await mockDelay()
  return clone(db.users)
}

/** Future: `POST /user/admin/create`. The new user gets an email to set their password. */
export const createUser = async (input: AdminUserInput): Promise<AdminUser> => {
  await mockDelay()
  assertUnique(input)
  if (db.users.length >= db.organization.limits.users) {
    throw new Error(`Your plan allows ${db.organization.limits.users} users. Remove someone or raise the limit first.`)
  }
  const user: AdminUser = {
    ...input,
    allowedIps: input.hasIpRestriction ? input.allowedIps : [],
    userId: db.nextId.user++,
    isEmailVerified: false,
    hasTotp2fa: false,
    hasEmail2fa: false,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  }
  db.users.push(user)
  db.organization.usage.users = db.users.length
  recordAudit('user.create', 'user', user.userName, `Role: ${db.roles.find((r) => r.roleId === user.roleId)?.roleName}`)
  return clone(user)
}

/** Future: `PUT /user/admin/update`. */
export const updateUser = async (userId: number, input: AdminUserInput): Promise<void> => {
  await mockDelay()
  const user = findUser(userId)
  assertUnique(input, userId)
  Object.assign(user, input, { allowedIps: input.hasIpRestriction ? input.allowedIps : [] })
  recordAudit('user.update', 'user', user.userName)
}

/** Future: `DELETE /user/admin/delete/{id}`. */
export const deleteUser = async (userId: number): Promise<void> => {
  await mockDelay()
  const user = findUser(userId)
  if (user.roleId === 1 && db.users.filter((u) => u.roleId === 1).length === 1) {
    throw new Error("You can't delete the last Owner. Give someone else the Owner role first.")
  }
  db.users = db.users.filter((u) => u.userId !== userId)
  db.organization.usage.users = db.users.length
  recordAudit('user.delete', 'user', user.userName)
}
