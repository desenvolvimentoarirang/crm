import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuthStore } from '../store/auth.store'
import { backendUrl } from '../config/runtime'

/**
 * Ao montar o app, tenta renovar o accessToken usando o refreshToken (cookie httpOnly).
 * Isso mantém o usuário logado após recarregar a página.
 */
export function useAuthInit() {
  const [ready, setReady] = useState(false)
  const { login, logout, user } = useAuthStore()

  useEffect(() => {
    axios
      .post(`${backendUrl}/api/auth/refresh`, {}, { withCredentials: true })
      .then(({ data }) => {
        login(data.accessToken, data.user ?? user)
      })
      .catch(() => {
        logout()
      })
      .finally(() => {
        setReady(true)
      })
  }, [])

  return ready
}
