import { api } from '../config/api'
import type { AuthUser } from '../types'

export const authService = {
  async login(email: string, password: string): Promise<{ accessToken: string; user: AuthUser }> {
    const { data } = await api.post('/auth/login', { email, password })
    return data
  },

  async logout() {
    await api.post('/auth/logout')
  },

  async me(): Promise<AuthUser> {
    const { data } = await api.get('/auth/me')
    return data.user
  },
}
