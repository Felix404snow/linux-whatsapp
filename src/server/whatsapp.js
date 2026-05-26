const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys')
const QRCode = require('qrcode')
const fs = require('fs')
const path = require('path')
const { Boom } = require('@hapi/boom')

class WhatsAppClient {
  constructor(notify) {
    this.notify = notify
    this.sock = null
    this.qrCode = null
    this.chats = new Map()
    this.messages = new Map()
    this.authFolder = path.join(require('os').homedir(), '.whatsapp-linux-auth')
  }

  async connect() {
    const { state, saveCreds } = await useMultiFileAuthState(this.authFolder)
    const { version, isLatest } = await fetchLatestBaileysVersion()
    console.log(`Usando WA v${version.join('.')}, latest: ${isLatest}`)

    this.sock = makeWASocket({
      version,
      logger: { info: () => {}, error: () => {}, warn: () => {}, debug: () => {}, trace: () => {}, child: () => ({info:()=>{},error:()=>{},warn:()=>{},debug:()=>{},trace:()=>{}}) },
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, { child: () => ({info:()=>{},error:()=>{},warn:()=>{},debug:()=>{},trace:()=>{}}) }),
      },
      generateHighQualityLinkPreview: true,
      syncFullHistory: false,
      markOnlineOnConnect: true,
      browser: ['Linux', 'Chrome', '22.04.4'],
    })

    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        const qrDataUrl = await QRCode.toDataURL(qr, { width: 400, margin: 2 })
        this.qrCode = qrDataUrl
        this.notify('qr-code', { qr: qrDataUrl })
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error instanceof Boom)
          ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
          : true

        this.notify('connection-update', {
          state: 'close',
          shouldReconnect,
          reason: lastDisconnect?.error?.message || 'Desconhecido',
        })

        if (shouldReconnect) {
          setTimeout(() => this.connect(), 3000)
        }
      } else if (connection === 'open') {
        this.notify('connection-update', { state: 'open' })
        this.qrCode = null
      } else if (connection === 'connecting') {
        this.notify('connection-update', { state: 'connecting' })
      }
    })

    this.sock.ev.on('creds.update', saveCreds)

    this.sock.ev.on('chats.set', ({ chats }) => {
      for (const chat of chats) {
        this.chats.set(chat.id, { ...chat, unreadCount: 0 })
      }
      this.notifyChats()
    })

    this.sock.ev.on('chats.upsert', (chats) => {
      for (const chat of chats) {
        const existing = this.chats.get(chat.id) || {}
        this.chats.set(chat.id, { ...existing, ...chat })
      }
      this.notifyChats()
    })

    this.sock.ev.on('chats.update', (updates) => {
      for (const update of updates) {
        const existing = this.chats.get(update.id)
        if (existing) {
          this.chats.set(update.id, { ...existing, ...update })
        }
      }
      this.notifyChats()
    })

    this.sock.ev.on('messages.upsert', ({ messages, type }) => {
      for (const msg of messages) {
        const jid = msg.key.remoteJid
        if (!jid) continue
        if (!this.messages.has(jid)) this.messages.set(jid, [])
        const arr = this.messages.get(jid)
        // evita duplicatas
        if (!arr.find(m => m.key.id === msg.key.id)) {
          arr.push(msg)
          // mantém últimas 200 mensagens
          if (arr.length > 200) arr.shift()
        }

        const chat = this.chats.get(jid)
        if (chat) {
          chat.conversationTimestamp = msg.messageTimestamp
          if (!msg.key.fromMe) chat.unreadCount = (chat.unreadCount || 0) + 1
          this.chats.set(jid, chat)
          this.notifyChats()
        }

        this.notify('messages-update', { jid, messages: this.messages.get(jid) })
      }
    })

    this.sock.ev.on('contacts.upsert', (contacts) => {
      for (const c of contacts) {
        if (c.id) {
          const chat = this.chats.get(c.id)
          if (chat) {
            chat.name = c.name || c.notify || chat.name
            this.chats.set(c.id, chat)
          }
        }
      }
      this.notifyChats()
    })

    // Carrega contatos iniciais
    setTimeout(async () => {
      try {
        const contacts = await this.sock.contactQuery('')
      } catch {}
    }, 5000)
  }

  notifyChats() {
    const list = Array.from(this.chats.values())
      .sort((a, b) => (b.conversationTimestamp || 0) - (a.conversationTimestamp || 0))
    this.notify('chats-update', list)
  }

  async sendMessage(to, text) {
    try {
      const result = await this.sock.sendMessage(to, { text })
      if (!this.messages.has(to)) this.messages.set(to, [])
      this.messages.get(to).push(result)
      this.notify('messages-update', { jid: to, messages: this.messages.get(to) })
      return { success: true, message: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async loadChatMessages(jid) {
    if (!this.messages.has(jid)) this.messages.set(jid, [])
    // Tenta buscar mais mensagens do servidor
    try {
      await this.sock.presenceSubscribe(jid)
    } catch {}
    return this.messages.get(jid)
  }

  async getProfilePicture(jid) {
    try {
      const url = await this.sock.profilePictureUrl(jid, 'image')
      return url
    } catch {
      return null
    }
  }

  async logout() {
    try {
      await this.sock.logout()
    } catch {}
    try {
      fs.rmSync(this.authFolder, { recursive: true, force: true })
    } catch {}
    this.chats.clear()
    this.messages.clear()
  }

  destroy() {
    if (this.sock) {
      try { this.sock.end() } catch {}
    }
  }
}

module.exports = WhatsAppClient
