const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js')
const QRCode = require('qrcode')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

function formatContactName(name, jid) {
  // Se tem nome saldo válido (não é ID, não é só dígitos)
  if (name && name.trim() && !name.includes('@')) {
    const digitsOnly = name.replace(/\D/g, '')
    // Se o nome tem letras OU é curto demais pra ser um número, é um nome real
    if (digitsOnly.length < name.length || digitsOnly.length < 8) {
      return name
    }
  }

  if (!jid) return 'Contato'

  const user = (jid.split('@')[0] || '').trim()
  const domain = (jid.split('@')[1] || '').trim()

  // LIDs são IDs internos do WhatsApp, não são números de telefone
  if (domain === 'lid') {
    return 'Contato'
  }

  // Grupos
  if (domain === 'g.us') {
    return name || 'Grupo'
  }

  // Extrai dígitos do número (antes do @)
  const raw = user.replace(/\D/g, '')

  if (!raw || raw.length < 8) {
    return 'Contato'
  }

  // Número brasileiro: 55 + DDD + 9 dígitos = 12-13 dígitos
  if (raw.startsWith('55') && raw.length >= 12) {
    const ddd = raw.slice(2, 4)
    const prefix = raw.slice(4, 9)
    const suffix = raw.slice(9, 13)
    return `+55 ${ddd} ${prefix.slice(0, 2)}***-${suffix}`
  }

  // Genérico: mostra primeiros dígitos e borra o meio
  const visibleStart = raw.slice(0, Math.min(4, raw.length - 4))
  const visibleEnd = raw.slice(-2)
  return `${visibleStart}****${visibleEnd}`
}

function findChrome() {
  const candidates = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
  ]
  // Procura no cache do puppeteer
  try {
    const cacheDir = path.join(require('os').homedir(), '.cache', 'puppeteer', 'chrome')
    if (fs.existsSync(cacheDir)) {
      const versions = fs.readdirSync(cacheDir)
      for (const v of versions) {
        const chromePath = path.join(cacheDir, v, 'chrome-linux64', 'chrome')
        if (fs.existsSync(chromePath)) return chromePath
      }
    }
  } catch {}
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  try {
    return execSync('which google-chrome || which chromium || which chromium-browser', { encoding: 'utf8' }).trim()
  } catch {}
  return null
}

module.exports.findChrome = findChrome

class WhatsAppClient {
  constructor(notify) {
    this.notify = notify
    this.client = null
    this.qrCode = null
    this.chats = new Map()
    this.messages = new Map()
    this.authFolder = path.join(require('os').homedir(), '.whatsapp-linux-auth-wwebjs')
    this.storeFile = path.join(this.authFolder, 'store.json')
    this.ready = false
    this.loadStore()
  }

  safeNotify(event, data) {
    try {
      // Garante que os dados são serializáveis
      const safe = JSON.parse(JSON.stringify(data))
      this.notify(event, safe)
    } catch (err) {
      console.error('Erro ao serializar notificação:', err.message)
    }
  }

  loadStore() {
    try {
      if (fs.existsSync(this.storeFile)) {
        const data = JSON.parse(fs.readFileSync(this.storeFile, 'utf8'))
        if (data.chats) {
          for (const [k, v] of Object.entries(data.chats)) {
            // Reformata o nome ao carregar do store
            const formatted = {
              ...v,
              name: formatContactName(v.name, k),
            }
            this.chats.set(k, formatted)
          }
        }
        if (data.messages) {
          for (const [k, v] of Object.entries(data.messages)) {
            this.messages.set(k, v)
          }
        }
        console.log(`Store carregado: ${this.chats.size} chats, ${this.messages.size} threads`)
        this.notifyChats()
      }
    } catch (err) {
      console.error('Erro ao carregar store:', err.message)
    }
  }

  saveStore() {
    try {
      const data = {
        chats: Object.fromEntries(this.chats),
        messages: Object.fromEntries(
          Array.from(this.messages.entries()).map(([k, v]) => [k, v.slice(-100)])
        ),
      }
      fs.writeFileSync(this.storeFile, JSON.stringify(data), 'utf8')
    } catch (err) {
      console.error('Erro ao salvar store:', err.message)
    }
  }

  async connect() {
    const chromePath = findChrome()
    console.log('Chrome encontrado:', chromePath)
    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: this.authFolder }),
      puppeteer: {
        headless: true,
        executablePath: chromePath || undefined,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--no-zygote',
        ],
      },
    })

    this.client.on('qr', async (qr) => {
      console.log('QR Code recebido')
      const qrDataUrl = await QRCode.toDataURL(qr, { width: 400, margin: 2 })
      this.qrCode = qrDataUrl
      this.safeNotify('qr-code', { qr: qrDataUrl })
    })

    this.client.on('authenticated', () => {
      console.log('Autenticado!')
    })

    this.client.on('auth_failure', (msg) => {
      console.error('Falha na autenticação:', msg)
      this.safeNotify('connection-update', { state: 'close', reason: msg })
    })

    this.client.on('ready', async () => {
      console.log('Cliente pronto!')
      this.ready = true
      this.safeNotify('connection-update', { state: 'open' })
      this.qrCode = null

      // Busca dados do usuário
      try {
        const me = this.client.info.wid._serialized
        const contact = await this.client.getContactById(me)
        let profilePic = null
        try { profilePic = await contact.getProfilePicUrl() } catch {}
        this.safeNotify('user-profile', {
          id: me,
          name: contact.name || contact.pushname || 'Você',
          profilePic,
        })
      } catch (err) {
        console.error('Erro ao buscar perfil:', err.message)
      }

      // Carrega todos os chats
      try {
        const allChats = await this.client.getChats()
        console.log(`Carregados ${allChats.length} chats`)
        for (const chat of allChats) {
          const existing = this.chats.get(chat.id._serialized) || {}
          let profilePic = existing.profilePic || null
          // Busca foto de perfil
          try {
            const contact = await this.client.getContactById(chat.id._serialized)
            const picUrl = await contact.getProfilePicUrl()
            if (picUrl) profilePic = picUrl
          } catch {}
          this.chats.set(chat.id._serialized, {
            ...existing,
            id: chat.id._serialized,
            name: formatContactName(chat.name, chat.id.user),
            conversationTimestamp: chat.timestamp || Date.now(),
            unreadCount: chat.unreadCount || 0,
            isGroup: chat.isGroup,
            profilePic,
          })
        }
        this.notifyChats()
        this.saveStore()
      } catch (err) {
        console.error('Erro ao carregar chats:', err.message)
      }
    })

    this.client.on('message_create', async (msg) => {
      const jid = msg.fromMe ? msg.to : msg.from
      if (!this.messages.has(jid)) this.messages.set(jid, [])
      const arr = this.messages.get(jid)
      const isNew = !arr.find(m => m.key.id === msg.id.id)
      if (isNew) {
        arr.push(await this.serializeMessage(msg))
        if (arr.length > 200) arr.shift()
      }

      const chat = this.chats.get(jid)
      if (chat) {
        chat.conversationTimestamp = msg.timestamp || Date.now()
        if (!msg.fromMe) chat.unreadCount = (chat.unreadCount || 0) + 1
        this.chats.set(jid, chat)
        this.notifyChats()
      } else if (!msg.fromMe) {
        // Cria chat temporário se não existir (só para mensagens recebidas)
        this.chats.set(jid, {
          id: jid,
          name: formatContactName(null, jid),
          conversationTimestamp: msg.timestamp || Date.now(),
          unreadCount: 1,
        })
        this.notifyChats()
      }

      // Notificação nativa + som para mensagens recebidas
      if (!msg.fromMe && isNew) {
        const contactChat = this.chats.get(jid)
        const title = contactChat?.name || formatContactName(null, jid)
        let body = msg.body
        if (msg.type === 'revoked') body = '🗑️ Mensagem apagada'
        else if (!body && msg.type === 'image') body = '📷 Imagem'
        else if (!body && msg.type === 'video') body = '🎥 Vídeo'
        else if (!body && msg.type === 'sticker') body = '🎯 Figurinha'
        else if (!body && (msg.type === 'audio' || msg.type === 'ptt')) body = '🎵 Áudio'
        else if (!body && msg.type === 'document') body = msg.filename || '📎 Documento'
        else if (!body) body = 'Nova mensagem'

        // Busca foto de perfil se não tiver
        let profilePic = contactChat?.profilePic || null
        if (!profilePic && this.ready) {
          try {
            const contact = await this.client.getContactById(jid)
            const picUrl = await contact.getProfilePicUrl()
            if (picUrl) {
              profilePic = picUrl
              if (contactChat) {
                contactChat.profilePic = picUrl
                this.chats.set(jid, contactChat)
                this.notifyChats()
                this.saveStore()
              }
            }
          } catch {}
        }

        this.safeNotify('notification', {
          title,
          body,
          icon: profilePic,
          jid,
        })
      }

      this.safeNotify('messages-update', { jid, messages: this.messages.get(jid) })
      this.saveStore()
    })

    this.client.on('disconnected', (reason) => {
      console.log('Desconectado:', reason)
      this.ready = false
      this.safeNotify('connection-update', { state: 'close', reason })
    })

    this.client.on('change_state', (state) => {
      console.log('Estado mudou:', state)
    })

    this.client.initialize().catch(err => {
      console.error('Erro ao inicializar:', err.message)
    })
  }

  async serializeMessage(msg) {
    // Detecta visualização única (view once)
    const raw = msg._data || msg.rawData || {}
    const mediaTypes = ['image', 'video', 'sticker', 'document', 'audio', 'ptt']
    const isViewOnce = Boolean(
      raw.isViewOnce || raw.isViewOnceMessage || raw.viewOnce ||
      // Heurística: tipo de mídia mas sem mídia acessível e sem texto = provavelmente view once
      (mediaTypes.includes(msg.type) && !msg.hasMedia && !msg.body)
    )

    const data = {
      key: {
        id: msg.id.id,
        serializedId: msg.id._serialized,
        remoteJid: msg.fromMe ? msg.to : msg.from,
        fromMe: msg.fromMe,
      },
      message: {
        conversation: msg.body,
      },
      messageTimestamp: msg.timestamp || Date.now(),
      type: msg.type,
      hasMedia: msg.hasMedia,
      media: null,
      filename: msg.filename || null,
      isViewOnce,
    }

    // Mensagem apagada
    if (msg.type === 'revoked') {
      data.message.conversation = '🗑️ Mensagem apagada'
      return data
    }

    // Visualização única
    const viewOnceMediaTypes = ['image', 'video', 'audio', 'ptt']
    if (isViewOnce && viewOnceMediaTypes.includes(msg.type)) {
      const typeLabels = {
        image: '👁️📷 Imagem de visualização única',
        video: '👁️🎥 Vídeo de visualização única',
        audio: '👁️🎵 Áudio de visualização única',
        ptt: '👁️🎤 Áudio de visualização única',
      }
      data.message.conversation = typeLabels[msg.type] || '👁️ Mídia de visualização única'
      return data
    }

    if (msg.hasMedia && mediaTypes.includes(msg.type)) {
      try {
        const media = await msg.downloadMedia()
        if (media) {
          data.media = `data:${media.mimetype};base64,${media.data}`
          data.filename = media.filename || msg.filename || null
          if (!data.message.conversation) {
            if (msg.type === 'image') data.message.conversation = '📷 Imagem'
            else if (msg.type === 'video') data.message.conversation = '🎥 Vídeo'
            else if (msg.type === 'sticker') data.message.conversation = '🎯 Figurinha'
            else if (msg.type === 'audio' || msg.type === 'ptt') data.message.conversation = '🎵 Áudio'
            else if (msg.type === 'document') data.message.conversation = data.filename || '📎 Documento'
          }
        }
      } catch (err) {
        console.error('Erro ao baixar mídia:', err.message)
      }
    }

    // Fallback: mensagens de mídia sem texto e sem media baixada
    if (!data.message.conversation && mediaTypes.includes(msg.type)) {
      const fallbackLabels = {
        image: '📷 Imagem',
        video: '🎥 Vídeo',
        sticker: '🎯 Figurinha',
        audio: '🎵 Áudio',
        ptt: '🎵 Áudio',
        document: '📎 Documento',
      }
      data.message.conversation = fallbackLabels[msg.type] || '📎 Mídia'
    }

    // Mensagem citada (resposta)
    if (msg.hasQuotedMsg) {
      try {
        const quoted = await msg.getQuotedMessage()
        if (quoted) {
          data.quotedMsg = {
            id: quoted.id?._serialized || quoted.id,
            body: quoted.body || '',
            fromMe: quoted.fromMe,
            type: quoted.type,
            media: null,
          }
          if (quoted.hasMedia) {
            try {
              const media = await quoted.downloadMedia()
              if (media) {
                data.quotedMsg.media = `data:${media.mimetype};base64,${media.data}`
              }
            } catch {}
          }
        }
      } catch (err) {
        console.error('Erro ao buscar mensagem citada:', err.message)
      }
    }

    return data
  }

  notifyChats() {
    const list = Array.from(this.chats.values())
      .sort((a, b) => (b.conversationTimestamp || 0) - (a.conversationTimestamp || 0))
    console.log(`notifyChats: enviando ${list.length} chats`)
    this.safeNotify('chats-update', list)
  }

  async getUserProfile() {
    try {
      if (!this.ready) return null
      const me = this.client.info.wid._serialized
      const contact = await this.client.getContactById(me)
      let profilePic = null
      try { profilePic = await contact.getProfilePicUrl() } catch {}
      return {
        id: me,
        name: contact.name || contact.pushname || 'Você',
        profilePic,
      }
    } catch {
      return null
    }
  }

  async sendMessage(to, text, quotedMsgId) {
    try {
      if (!this.ready) return { success: false, error: 'Cliente não pronto' }
      const chat = await this.client.getChatById(to)
      if (quotedMsgId) {
        await chat.sendMessage(text, { quotedMessageId: quotedMsgId })
      } else {
        await chat.sendMessage(text)
      }
      // NÃO adiciona localmente — message_create vai disparar e adicionar
      return { success: true }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err.message)
      return { success: false, error: err.message }
    }
  }

  async sendFile(to, file) {
    try {
      if (!this.ready) return { success: false, error: 'Cliente não pronto' }
      const chat = await this.client.getChatById(to)
      const media = new MessageMedia(file.mimetype, file.data, file.name)
      await chat.sendMessage(media)
      // NÃO adiciona localmente — message_create vai disparar e adicionar
      return { success: true }
    } catch (err) {
      console.error('Erro ao enviar arquivo:', err.message)
      return { success: false, error: err.message }
    }
  }

  async sendAudio(to, audioBase64, mimetype) {
    try {
      if (!this.ready) return { success: false, error: 'Cliente não pronto' }
      if (!audioBase64 || audioBase64.length < 100) {
        console.error('Audio base64 inválido:', audioBase64?.length)
        return { success: false, error: 'Dados de áudio inválidos' }
      }
      console.log('sendAudio:', to, 'mimetype original:', mimetype, 'base64 length:', audioBase64.length)
      const chat = await this.client.getChatById(to)

      // Converte webm para ogg usando ffmpeg (WhatsApp Web não aceita webm diretamente)
      const os = require('os')
      const { execFile } = require('child_process')
      const ffmpegPath = require('ffmpeg-static')
      const tmpId = Date.now()
      const inputPath = path.join(os.tmpdir(), `wa-audio-in-${tmpId}.webm`)
      const outputPath = path.join(os.tmpdir(), `wa-audio-out-${tmpId}.ogg`)

      fs.writeFileSync(inputPath, Buffer.from(audioBase64, 'base64'))
      console.log('Convertendo áudio com ffmpeg...')

      await new Promise((resolve, reject) => {
        execFile(ffmpegPath, [
          '-i', inputPath,
          '-c:a', 'libopus',
          '-b:a', '24k',
          '-vn',
          '-y',
          outputPath
        ], (err, stdout, stderr) => {
          fs.unlinkSync(inputPath)
          if (err) {
            console.error('ffmpeg erro:', stderr)
            reject(err)
          } else {
            resolve()
          }
        })
      })

      const oggBuffer = fs.readFileSync(outputPath)
      fs.unlinkSync(outputPath)
      const oggBase64 = oggBuffer.toString('base64')
      console.log('Conversão ok, ogg size:', oggBase64.length)

      const sendMimetype = 'audio/ogg; codecs=opus'
      const media = new MessageMedia(sendMimetype, oggBase64, 'audio.ogg')
      await chat.sendMessage(media, { sendAudioAsVoice: true })
      console.log('Áudio enviado com sucesso')
      return { success: true }
    } catch (err) {
      console.error('Erro ao enviar áudio:', err.message, err.stack)
      return { success: false, error: err.message || 'Erro desconhecido' }
    }
  }

  async loadChatMessages(jid) {
    if (!this.messages.has(jid)) this.messages.set(jid, [])
    // Tenta buscar mensagens do chat
    try {
      if (this.ready) {
        const chat = await this.client.getChatById(jid)
        const msgs = await chat.fetchMessages({ limit: 50 })
        const serialized = await Promise.all(msgs.map(m => this.serializeMessage(m)))
        this.messages.set(jid, serialized)
        this.safeNotify('messages-update', { jid, messages: serialized })
      }
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err.message)
    }
    return this.messages.get(jid)
  }

  async getProfilePicture(jid) {
    try {
      if (!this.ready) return null
      const contact = await this.client.getContactById(jid)
      const url = await contact.getProfilePicUrl()
      return url
    } catch {
      return null
    }
  }

  async markChatAsRead(jid) {
    try {
      if (!this.ready) return false
      const chat = await this.client.getChatById(jid)
      await chat.sendSeen()
      const c = this.chats.get(jid)
      if (c) {
        c.unreadCount = 0
        this.chats.set(jid, c)
        this.notifyChats()
        this.saveStore()
      }
      return true
    } catch (err) {
      console.error('Erro ao marcar como lido:', err.message)
      return false
    }
  }

  async startNewChat(phone) {
    const jid = phone.includes('@') ? phone : `${phone.replace(/\D/g, '')}@c.us`
    if (!this.chats.has(jid)) {
      this.chats.set(jid, {
        id: jid,
        name: formatContactName(null, phone),
        conversationTimestamp: Date.now() / 1000,
        unreadCount: 0,
      })
      this.messages.set(jid, [])
      this.notifyChats()
      this.saveStore()
    }
    return jid
  }

  async logout() {
    try {
      await this.client.logout()
    } catch {}
    try {
      fs.rmSync(this.authFolder, { recursive: true, force: true })
    } catch {}
    this.chats.clear()
    this.messages.clear()
    this.ready = false
  }

  destroy() {
    if (this.client) {
      try { this.client.destroy() } catch {}
    }
  }
}

module.exports = WhatsAppClient
module.exports.findChrome = findChrome
