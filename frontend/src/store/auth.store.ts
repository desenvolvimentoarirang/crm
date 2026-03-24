import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '../types'

interface AuthState {
  accessToken: string | null
  user: AuthUser | null
  setToken: (token: string) => void
  setUser: (user: AuthUser) => void
  login: (token: string, user: AuthUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setToken: (accessToken) => set({ accessToken }),
      setUser: (user) => set({ user }),
      login: (accessToken, user) => set({ accessToken, user }),
      logout: () => set({ accessToken: null, user: null }),
    }),
    {
      name: 'crm-auth',
      partialize: (state) => ({ user: state.user }), // Don't persist access token
    },
  ),
)
