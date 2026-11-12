/** "priya@acme.dev" -> "p•••@acme.dev" */
export const maskEmail = (email: string): string => {
  const [local, domain] = email.split('@')
  if (!domain || local.length === 0) return email
  return `${local[0]}•••@${domain}`
}
