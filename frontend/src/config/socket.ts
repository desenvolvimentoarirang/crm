import { io, Socket } from 'socket.io-client'

import { backendUrl } from './runtime'

let socket: Socket | null = null

const socketUrl = backendUrl

export function getSocket(): Socket {
  if (!socket) {
    socket = io(socketUrl, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      withCredentials: true,
    })
  }
  return socket
}

export function connectSocket(token: string) {
  const s = getSocket()
  s.auth = { token }
  s.connect()
  return s
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}
