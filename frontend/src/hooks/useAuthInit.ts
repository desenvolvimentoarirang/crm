import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuthStore } from '../store/auth.store'

/**
 * Ao montar o app, tenta renovar o accessToken usando o refreshToken (cookie httpOnly).
 * Isso mantém o usuário logado após recarregar a página.
 */
export function useAuthInit() {
  const [ready, setReady] = useState(false)
  const { accessToken, login, logout } = useAuthStore()

  useEffect(() => {
    // Se já tem token em memória, não precisa renovar
    if (accessToken) {
      setReady(true)
      return
    }

    axios
      .post('/api/auth/refresh', {}, { withCredentials: true })
      .then(({ data }) => {
        // Refresh funcionou — salva o novo accessToken e o user
        login(data.accessToken, data.user ?? useAuthStore.getState().user)
      })
      .catch(() => {
        // Refresh falhou (cookie expirado ou inexistente) — faz logout limpo
        logout()
      })
      .finally(() => {
        setReady(true)
      })
  }, [])

  return ready
}
