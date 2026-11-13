import { describe, expect, it } from 'vitest'
import { loginSchema } from '@/features/auth/schema/loginSchema'

describe('loginSchema', () => {
  it('accepts valid credentials', async () => {
    await expect(
      loginSchema.validate({ userName: 'admin', password: 'secret', rememberMe: true }),
    ).resolves.toMatchObject({ userName: 'admin', password: 'secret' })
  })

  it('rejects an empty email', async () => {
    await expect(loginSchema.validate({ userName: '', password: 'secret' })).rejects.toThrow('Enter your email.')
  })

  it('rejects an empty password', async () => {
    await expect(loginSchema.validate({ userName: 'admin', password: '' })).rejects.toThrow(
      'Enter your password.',
    )
  })

  it('trims whitespace from the username', async () => {
    await expect(
      loginSchema.validate({ userName: '  admin  ', password: 'secret' }),
    ).resolves.toMatchObject({ userName: 'admin' })
  })
})
