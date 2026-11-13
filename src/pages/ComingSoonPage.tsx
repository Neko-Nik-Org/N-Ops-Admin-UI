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

/** Shows the section `title` and a short "not built yet" note. */
/** Placeholder page for sections that are planned but not built yet. */

export const ComingSoonPage = ({ title }: { title: string }) => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
    <h1 className="text-xl font-semibold text-text">{title}</h1>
    <p className="max-w-sm text-sm text-text-muted">This section isn't built yet — it's reserved in the nav for where it'll live.</p>
  </div>
)
