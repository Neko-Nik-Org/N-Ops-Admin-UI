import * as yup from 'yup'

export const inviteSchema = yup.object({
  fullName: yup.string().trim().required('Enter your full name.'),
  password: yup.string().trim().min(8, 'Use at least 8 characters.').required('Create a password.'),
})

export type InviteFormValues = yup.InferType<typeof inviteSchema>
