import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WASocket,
  proto,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import * as fs from 'fs'
import * as path from 'path'
import pino from 'pino'
import QRCode from 'qrcode'
import { prisma } from '../config/database'
import { redis } from '../config/redis'
import { logger } from '../utils/logger'

const SESSIONS_DIR = path.join(process.cwd(), 'baileys-sessions')
const baileysLogger = pino({ level: 'silent' })

interface SessionInfo {
  socket: WASocket
}

class BaileysManager {
  private sessions = new Map<string, SessionInfo>()
  private io: any = null

  setIO(io: any) {
    this.io = io
  }

  async createSession(instanceName: string): Promise<void> {
    if (this.sessions.has(instanceName)) return

    const sessionDir = path.join(SESSIONS_DIR, instanceName)
    fs.mkdirSync(sessionDir, { recursive: true })

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir)
    const { version } = await fetchLatestBaileysVersion()

    logger.info({ instanceName, version }, 'Starting Baileys session')

    const socket = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, baileysLogger),
      },
      printQRInTerminal: false,
      logger: baileysLogger,
      browser: ['CRM WhatsApp', 'Chrome', '22.0'],
      generateHighQualityLinkPreview: true,
    })

    this.sessions.set(instanceName, { socket })

    socket.ev.on('creds.update', saveCreds)

    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        try {
          const qrBase64 = await QRCode.toDataURL(qr)
          await redis.setex(`qr:${instanceName}`, 60, qrBase64)
          this.io?.emit('instance:qr', { instanceName, qrCode: qrBase64 })
          await prisma.whatsAppInstance.updateMany({
            where: { name: instanceName },
            data: { status: 'qr', qrCode: qrBase64 },
          })
          logger.info({ instanceName }, 'QR code generated')
        } catch (err) {
          logger.error({ instanceName, err }, 'Failed to process QR code')
        }
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut

        logger.info({ instanceName, statusCode, shouldReconnect }, 'Connection closed')

        this.sessions.delete(instanceName)
        await prisma.whatsAppInstance.updateMany({
          where: { name: instanceName },
          data: { status: 'disconnected', qrCode: null },
        })
        await redis.del(`qr:${instanceName}`)
        this.io?.emit('instance:status', { instanceName, state: 'disconnected' })

        if (shouldReconnect) {
          setTimeout(() => this.createSession(instanceName), 3000)
        }
      }

      if (connection === 'open') {
        const phone = socket.user?.id?.split(':')[0] ?? null
        await prisma.whatsAppInstance.updateMany({
          where: { name: instanceName },
          data: { status: 'open', phone, qrCode: null },
        })
        await redis.del(`qr:${instanceName}`)
        this.io?.emit('instance:status', { instanceName, state: 'open' })
        logger.info({ instanceName, phone }, 'Connected to WhatsApp')
      }
    })

    socket.ev.on('messages.upsert', async ({ messages: msgs, type }) => {
      if (type !== 'notify') return
      for (const msg of msgs) {
        await this.handleIncomingMessage(instanceName, msg).catch((err) => {
          logger.error({ instanceName, err: err.message }, 'Failed to process message')
        })
      }
    })
  }

  private async handleIncomingMessage(instanceName: string, msg: proto.IWebMessageInfo) {
    if (!msg.key?.remoteJid) return
    if (msg.key.remoteJid.endsWith('@g.us') || msg.key.remoteJid === 'status@broadcast') return
    // Skip protocol/system messages
    if (msg.message?.protocolMessage || msg.message?.reactionMessage || msg.message?.senderKeyDistributionMessage) return

    const phone = msg.key.remoteJid.replace('@s.whatsapp.net', '')
    const fromMe = msg.key.fromMe ?? false
    const messageId = msg.key.id ?? `msg_${Date.now()}`

    // Skip messages from the instance's own number
    if (fromMe) {
      const instanceRecord = await prisma.whatsAppInstance.findFirst({ where: { name: instanceName } })
      if (instanceRecord?.phone && instanceRecord.phone === phone) return
    }

    const contact = await prisma.contact.upsert({
      where: { phone },
      update: { pushName: msg.pushName ?? undefined },
      create: { phone, name: msg.pushName ?? undefined, pushName: msg.pushName ?? undefined },
    })

    const instance = await prisma.whatsAppInstance.upsert({
      where: { name: instanceName },
      update: {},
      create: { name: instanceName, displayName: instanceName },
    })

    const conversation = await prisma.conversation.upsert({
      where: { contactId_instanceId: { contactId: contact.id, instanceId: instance.id } },
      update: {
        lastMessageAt: new Date(),
        status: fromMe ? undefined : 'OPEN',
        unreadCount: fromMe ? undefined : { increment: 1 },
      },
      create: {
        contactId: contact.id,
        instanceId: instance.id,
        clientAdminId: instance.clientAdminId,
        status: 'OPEN',
        lastMessageAt: new Date(),
        unreadCount: fromMe ? 0 : 1,
      },
      include: {
        contact: true,
        assignedTo: { select: { id: true, name: true } },
        instance: { select: { id: true, name: true } },
      },
    })

    const msgContent = this.extractMessageContent(msg)
    if (!msgContent) return  // Skip unsupported message types silently

    const message = await prisma.message.upsert({
      where: { evolutionId: messageId },
      update: { status: fromMe ? 'SENT' : 'READ' },
      create: {
        conversationId: conversation.id,
        evolutionId: messageId,
        direction: fromMe ? 'OUTBOUND' : 'INBOUND',
        type: msgContent.type as any,
        body: msgContent.body,
        mediaUrl: msgContent.mediaUrl,
        mimeType: msgContent.mimeType,
        fileName: msgContent.fileName,
        timestamp: new Date((msg.messageTimestamp as number ?? Date.now() / 1000) * 1000),
        status: fromMe ? 'SENT' : 'DELIVERED',
      },
    })

    // Broadcast via Socket.io — scoped
    const conversationWithMessage = { ...conversation, messages: [message] }
    this.io?.to(`conversation:${conversation.id}`).emit('message:new', message)
    if (conversation.clientAdminId) {
      this.io?.to(`scope:${conversation.clientAdminId}`).emit('conversation:updated', conversationWithMessage)
      this.io?.to(`scope:${conversation.clientAdminId}`).emit('conversations:refresh')
    } else {
      this.io?.emit('conversation:updated', conversationWithMessage)
      this.io?.emit('conversations:refresh')
    }
    logger.info({ conversationId: conversation.id, phone, fromMe }, 'Message processed')
  }

  private extractMessageContent(msg: proto.IWebMessageInfo) {
    let content: any = msg.message ?? {}

    // Unwrap ephemeral, viewOnce, and edited message wrappers
    if (content.ephemeralMessage) content = content.ephemeralMessage.message ?? content
    if (content.viewOnceMessage) content = content.viewOnceMessage.message ?? content
    if (content.viewOnceMessageV2) content = content.viewOnceMessageV2.message ?? content
    if (content.editedMessage) content = content.editedMessage.message ?? content
    if (content.documentWithCaptionMessage) content = content.documentWithCaptionMessage.message ?? content

    if (content.conversation || content.extendedTextMessage) {
      return {
        type: 'TEXT',
        body: content.conversation ?? content.extendedTextMessage?.text ?? '',
        mediaUrl: undefined, mimeType: undefined, fileName: undefined,
      }
    }
    if (content.imageMessage) {
      return {
        type: 'IMAGE',
        body: content.imageMessage.caption ?? undefined,
        mediaUrl: content.imageMessage.url ?? undefined,
        mimeType: content.imageMessage.mimetype ?? undefined,
        fileName: undefined,
      }
    }
    if (content.videoMessage) {
      return {
        type: 'VIDEO',
        body: content.videoMessage.caption ?? undefined,
        mediaUrl: content.videoMessage.url ?? undefined,
        mimeType: content.videoMessage.mimetype ?? undefined,
        fileName: undefined,
      }
    }
    if (content.audioMessage || content.pttMessage) {
      const audio = content.audioMessage ?? content.pttMessage
      return {
        type: 'AUDIO', body: undefined,
        mediaUrl: audio?.url ?? undefined,
        mimeType: audio?.mimetype ?? undefined,
        fileName: undefined,
      }
    }
    if (content.documentMessage) {
      return {
        type: 'DOCUMENT',
        body: content.documentMessage.caption ?? undefined,
        mediaUrl: content.documentMessage.url ?? undefined,
        mimeType: content.documentMessage.mimetype ?? undefined,
        fileName: content.documentMessage.fileName ?? undefined,
      }
    }
    if (content.stickerMessage) {
      return {
        type: 'STICKER', body: undefined,
        mediaUrl: content.stickerMessage.url ?? undefined,
        mimeType: 'image/webp', fileName: undefined,
      }
    }
    if (content.buttonsResponseMessage) {
      return { type: 'TEXT', body: content.buttonsResponseMessage.selectedDisplayText ?? '', mediaUrl: undefined, mimeType: undefined, fileName: undefined }
    }
    if (content.listResponseMessage) {
      return { type: 'TEXT', body: content.listResponseMessage.title ?? '', mediaUrl: undefined, mimeType: undefined, fileName: undefined }
    }
    if (content.contactMessage || content.contactsArrayMessage) {
      return { type: 'TEXT', body: `📇 ${content.contactMessage?.displayName ?? 'Contact'}`, mediaUrl: undefined, mimeType: undefined, fileName: undefined }
    }
    if (content.locationMessage || content.liveLocationMessage) {
      return { type: 'TEXT', body: '📍 Location', mediaUrl: undefined, mimeType: undefined, fileName: undefined }
    }
    return null
  }

  async sendText(instanceName: string, phone: string, text: string) {
    const session = this.sessions.get(instanceName)
    if (!session) throw new Error(`Instance "${instanceName}" is not connected`)
    const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`
    return session.socket.sendMessage(jid, { text })
  }

  async sendMedia(instanceName: string, phone: string, media: {
    type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT'
    url: string
    caption?: string
    fileName?: string
    mimeType?: string
  }) {
    const session = this.sessions.get(instanceName)
    if (!session) throw new Error(`Instance "${instanceName}" is not connected`)
    const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`

    let msg: any
    switch (media.type) {
      case 'IMAGE':
        msg = { image: { url: media.url }, caption: media.caption, mimetype: media.mimeType }
        break
      case 'VIDEO':
        msg = { video: { url: media.url }, caption: media.caption, mimetype: media.mimeType }
        break
      case 'AUDIO':
        msg = { audio: { url: media.url }, mimetype: media.mimeType ?? 'audio/mpeg', ptt: false }
        break
      case 'DOCUMENT':
        msg = { document: { url: media.url }, mimetype: media.mimeType, fileName: media.fileName, caption: media.caption }
        break
    }

    return session.socket.sendMessage(jid, msg)
  }

  async getQR(instanceName: string): Promise<string | null> {
    return redis.get(`qr:${instanceName}`)
  }

  getStatus(instanceName: string): string {
    return this.sessions.has(instanceName) ? 'connected' : 'disconnected'
  }

  async deleteSession(instanceName: string) {
    const session = this.sessions.get(instanceName)
    if (session) {
      try { await session.socket.logout() } catch { /* ignore */ }
      this.sessions.delete(instanceName)
    }
    const sessionDir = path.join(SESSIONS_DIR, instanceName)
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true })
    }
    await redis.del(`qr:${instanceName}`)
  }

  async restoreAllSessions() {
    const instances = await prisma.whatsAppInstance.findMany({ where: { isActive: true } })
    for (const inst of instances) {
      const sessionDir = path.join(SESSIONS_DIR, inst.name)
      if (fs.existsSync(sessionDir)) {
        logger.info({ instanceName: inst.name }, 'Restoring session')
        await this.createSession(inst.name).catch((err) => {
          logger.error({ instanceName: inst.name, err: err.message }, 'Failed to restore session')
        })
      }
    }
  }
}

export const baileysManager = new BaileysManager()
