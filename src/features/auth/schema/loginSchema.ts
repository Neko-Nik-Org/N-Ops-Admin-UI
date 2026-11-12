import * as yup from 'yup'

export const loginSchema = yup.object({
  userName: yup.string().trim().required('Enter your email.'),
  password: yup.string().required('Enter your password.'),
  rememberMe: yup.boolean().default(false),
})

export type LoginFormValues = yup.InferType<typeof loginSchema>
