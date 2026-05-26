const { app, BrowserWindow, ipcMain, dialog, Notification, nativeImage, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { exec } = require('child_process')
const https = require('https')
const Jimp = require('jimp')
const WhatsAppClient = require('./whatsapp')
const { findChrome } = require('./whatsapp')

// Desabilita sandbox e GPU que crasham no Linux (mantém SwiftShader para renderizar)
app.commandLine.appendSwitch('no-sandbox')
app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('disable-dev-shm-usage')
app.commandLine.appendSwitch('no-zygote')
app.commandLine.appendSwitch('disable-software-rasterizer')

// Diagnóstico: loga erros não tratados para que não fechem silenciosamente
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err)
  dialog.showErrorBox('Erro inesperado', err.message || String(err))
})
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason)
})

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    if (!url || !url.startsWith('http')) return reject(new Error('Invalid URL'))
    https.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`Status ${res.statusCode}`))
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks)))
    }).on('error', reject)
  })
}

async function createCircularIcon(imageBuffer, size = 128) {
  const image = await Jimp.read(imageBuffer)
  image.cover(size, size)

  const mask = new Jimp(size, size, 0x00000000)
  const cx = size / 2
  const cy = size / 2
  const r = size / 2
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - cx
      const dy = y + 0.5 - cy
      if (Math.sqrt(dx * dx + dy * dy) <= r) {
        mask.setPixelColor(0xFFFFFFFF, x, y)
      }
    }
  }

  image.mask(mask, 0, 0)
  const buf = await image.getBufferAsync(Jimp.MIME_PNG)
  return nativeImage.createFromBuffer(buf)
}

function playNotificationSound() {
  const soundPath = path.join(__dirname, '../assets/dragon-studio-new-notification-3-398649.mp3')
  const players = [
    `paplay "${soundPath}"`,
    `aplay "${soundPath}"`,
    `ffplay -nodisp -autoexit -loglevel quiet "${soundPath}"`,
    `cvlc --play-and-exit --quiet "${soundPath}"`,
  ]
  // Tenta cada player até um funcionar
  function tryPlayer(i) {
    if (i >= players.length) return
    exec(players[i], (err) => {
      if (err) tryPlayer(i + 1)
    })
  }
  tryPlayer(0)
}

function getAppIcon() {
  const candidates = [
    path.join(__dirname, '../assets/icon.png'),
    path.join(process.resourcesPath, 'app.asar', 'assets', 'icon.png'),
    path.join(process.resourcesPath, 'assets', 'icon.png'),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      try {
        const img = nativeImage.createFromPath(c)
        if (!img.isEmpty()) return img
      } catch {}
    }
  }
  return null
}

let mainWindow
let waClient

// Só envia IPC se o frame do renderer estiver realmente pronto
function safeSend(win, channel, ...args) {
  if (!win || win.isDestroyed()) return
  const wc = win.webContents
  if (!wc || wc.isDestroyed()) return
  if (wc.isLoading()) return
  if (!wc.mainFrame) return
  // Força acesso ao frame para detectar se foi disposed
  try {
    // eslint-disable-next-line no-unused-expressions
    wc.mainFrame.url
  } catch {
    return
  }
  try {
    wc.send(channel, ...args)
  } catch {
    // ignora silenciosamente
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'WhatsApp Linux',
    icon: getAppIcon() || undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#313338',
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
  // Quando o frontend carregar, sincroniza o estado atual
  mainWindow.webContents.on('did-finish-load', () => {
    if (waClient) {
      if (waClient.ready) {
        safeSend(mainWindow, 'connection-update', { state: 'open' })
      } else if (waClient.qrCode) {
        safeSend(mainWindow, 'qr-code', { qr: waClient.qrCode })
      } else {
        safeSend(mainWindow, 'connection-update', { state: 'connecting' })
      }
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Detecta crash do renderer para diagnóstico
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('Renderer process CRASHED:', details.reason, details.exitCode)
  })

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Falha ao carregar página:', errorCode, errorDescription)
  })
}

app.whenReady().then(() => {
  // Verifica se o Chrome/Chromium está disponível antes de prosseguir
  const chromePath = findChrome()
  if (!chromePath) {
    dialog.showErrorBox(
      'Chrome/Chromium não encontrado',
      'O WhatsApp Linux precisa do Google Chrome ou Chromium instalado para funcionar.\n\n' +
      'Instale um deles e tente novamente:\n' +
      '  sudo apt install chromium-browser\n' +
      '  sudo apt install google-chrome-stable\n\n' +
      'Ou baixe em: https://www.google.com/chrome/'
    )
    app.quit()
    return
  }

  createWindow()

  waClient = new WhatsAppClient(async (event, data) => {
    if (event === 'notification') {
      // Toca som de notificação
      playNotificationSound()
      // Baixa a imagem do perfil para exibir na notificação nativa
      let notifIcon = undefined
      if (data.icon) {
        try {
          const imgBuffer = await downloadImage(data.icon)
          notifIcon = nativeImage.createFromBuffer(imgBuffer)
        } catch (err) {
          console.error('Erro ao criar ícone da notificação:', err.message)
        }
      }
      // Notificação nativa do Linux — funciona mesmo minimizado
      const notif = new Notification({
        title: data.title || 'WhatsApp',
        body: data.body || 'Nova mensagem',
        icon: notifIcon,
        silent: true, // som customizado via playNotificationSound
      })
      notif.on('click', () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore()
          if (!mainWindow.isVisible()) mainWindow.show()
          mainWindow.focus()
          if (data.jid) {
            safeSend(mainWindow, 'select-chat', { jid: data.jid })
          }
        }
      })
      notif.show()
    }
    safeSend(mainWindow, event, data)
  })

  waClient.connect()

  // Se após 15s não tiver chats, notifica o frontend
  setTimeout(() => {
    if (waClient && waClient.chats.size === 0) {
      safeSend(mainWindow, 'needs-resync', true)
    }
  }, 15000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (waClient) waClient.destroy()
  if (process.platform !== 'darwin') app.quit()
})

// IPC handlers
ipcMain.handle('send-message', async (_, { to, text, quotedMsgId }) => {
  if (!waClient) return { success: false, error: 'Não conectado' }
  return waClient.sendMessage(to, text, quotedMsgId)
})

ipcMain.handle('send-audio', async (_, { to, audioBase64, mimetype }) => {
  if (!waClient) return { success: false, error: 'Não conectado' }
  return waClient.sendAudio(to, audioBase64, mimetype)
})

ipcMain.handle('load-chat', async (_, jid) => {
  if (!waClient) return []
  return waClient.loadChatMessages(jid)
})

ipcMain.handle('get-profile-picture', async (_, jid) => {
  if (!waClient) return null
  return waClient.getProfilePicture(jid)
})

ipcMain.handle('logout', async () => {
  if (!waClient) return
  await waClient.logout()
})

ipcMain.handle('start-new-chat', async (_, phone) => {
  if (!waClient) return null
  return waClient.startNewChat(phone)
})

ipcMain.handle('mark-chat-read', async (_, jid) => {
  if (!waClient) return false
  return waClient.markChatAsRead(jid)
})

ipcMain.handle('restart-app', async () => {
  if (waClient) {
    await waClient.logout()
    waClient.destroy()
  }
  app.relaunch()
  app.quit()
})

ipcMain.handle('select-file', async () => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Imagens', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] },
      { name: 'Vídeos', extensions: ['mp4', 'webm', 'mov', 'avi'] },
      { name: 'Documentos', extensions: ['pdf', 'doc', 'docx', 'txt', 'zip', 'rar'] },
      { name: 'Todos', extensions: ['*'] },
    ]
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const fs = require('fs')
  const path = require('path')
  const filePath = result.filePaths[0]
  const buffer = fs.readFileSync(filePath)
  const ext = path.extname(filePath).toLowerCase()
  const mimeTypes = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
    '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo', '.pdf': 'application/pdf',
    '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain', '.zip': 'application/zip', '.rar': 'application/x-rar-compressed',
  }
  return {
    name: path.basename(filePath),
    data: buffer.toString('base64'),
    mimetype: mimeTypes[ext] || 'application/octet-stream',
  }
})

ipcMain.handle('send-file', async (_, { to, file }) => {
  if (!waClient) return { success: false, error: 'Não conectado' }
  return waClient.sendFile(to, file)
})

ipcMain.handle('get-clipboard-type', async () => {
  // Retorna 'image' se tem imagem no clipboard, 'text' se tem texto, 'none' se vazio
  const formats = require('electron').clipboard.availableFormats()
  if (formats.some(f => f.startsWith('image/'))) return 'image'
  const text = require('electron').clipboard.readText()
  if (text && text.trim()) return 'text'
  return 'none'
})


ipcMain.handle('get-clipboard-text', async () => {
  return require('electron').clipboard.readText()
})

ipcMain.handle('get-clipboard-image', async () => {
  const nativeImage = require('electron').clipboard.readImage()
  if (nativeImage.isEmpty()) return null
  return {
    data: nativeImage.toPNG().toString('base64'),
    mimetype: 'image/png',
    name: 'imagem-colar.png',
  }
})

ipcMain.handle('open-external', async (_, url) => {
  await shell.openExternal(url)
})

ipcMain.handle('save-file', async (_, { defaultName, dataUrl }) => {
  if (!mainWindow) return { success: false, error: 'Janela não disponível' }
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName || 'download',
    filters: [{ name: 'Todos os arquivos', extensions: ['*'] }]
  })
  if (result.canceled) return { success: false, canceled: true }
  try {
    const base64 = dataUrl.split(',')[1]
    const buffer = Buffer.from(base64, 'base64')
    fs.writeFileSync(result.filePath, buffer)
    return { success: true, path: result.filePath }
  } catch (err) {
    return { success: false, error: err.message }
  }
})
