export interface InviteDetails {
  inviterName: string
  organizationName: string
  role: string
  tags: string[]
  email: string
}

export interface AcceptInvitePayload {
  fullName: string
  password: string
}
