import axios from 'axios'
import { env } from '../config/env'

const client = axios.create({
  baseURL: env.EVOLUTION_API_URL,
  headers: { apikey: env.EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
  timeout: 10000,
})

export const evolutionApi = {
  // ─── Instances ─────────────────────────────────────────────────────────────
  async createInstance(name: string) {
    const { data } = await client.post('/instance/create', {
      instanceName: name,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
    })
    return data
  },

  async setWebhook(instanceName: string, webhookUrl: string) {
    const { data } = await client.post(`/webhook/set/${instanceName}`, {
      webhook: {
        enabled: true,
        url: webhookUrl,
        webhookByEvents: true,
        webhookBase64: false,
        events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'],
      },
    })
    return data
  },

  async getInstanceStatus(name: string) {
    const { data } = await client.get(`/instance/connectionState/${name}`)
    return data
  },

  async getQRCode(name: string) {
    const { data } = await client.get(`/instance/connect/${name}`)
    return data
  },

  async connectInstance(name: string) {
    const { data } = await client.get(`/instance/connect/${name}`)
    return data
  },

  async restartInstance(name: string) {
    const { data } = await client.post(`/instance/restart/${name}`)
    return data
  },

  async logoutInstance(name: string) {
    const { data } = await client.delete(`/instance/logout/${name}`)
    return data
  },

  async deleteInstance(name: string) {
    const { data } = await client.delete(`/instance/delete/${name}`)
    return data
  },

  async listInstances() {
    const { data } = await client.get('/instance/fetchInstances')
    return data
  },

  // ─── Messages ──────────────────────────────────────────────────────────────
  async sendText(instanceName: string, phone: string, text: string) {
    const { data } = await client.post(`/message/sendText/${instanceName}`, {
      number: phone,
      text,
    })
    return data
  },

  async sendMedia(instanceName: string, phone: string, media: {
    type: 'image' | 'video' | 'audio' | 'document'
    url: string
    caption?: string
    fileName?: string
  }) {
    const endpoint = `/message/sendMedia/${instanceName}`
    const { data } = await client.post(endpoint, {
      number: phone,
      mediatype: media.type,
      media: media.url,
      caption: media.caption,
      fileName: media.fileName,
    })
    return data
  },

  async sendAudio(instanceName: string, phone: string, audioUrl: string) {
    const { data } = await client.post(`/message/sendWhatsAppAudio/${instanceName}`, {
      number: phone,
      audio: audioUrl,
    })
    return data
  },

  // ─── Contacts ──────────────────────────────────────────────────────────────
  async getProfilePicture(instanceName: string, phone: string) {
    try {
      const { data } = await client.get(`/chat/fetchProfilePictureUrl/${instanceName}`, {
        data: { number: phone },
      })
      return data?.profilePictureUrl as string | undefined
    } catch {
      return undefined
    }
  },
}
