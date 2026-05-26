import React, { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import ChatView from './components/ChatView'
import QRModal from './components/QRModal'
import WallpaperModal from './components/WallpaperModal'

export default function App() {
  const [connectionState, setConnectionState] = useState('connecting')
  const [qrCode, setQrCode] = useState(null)
  const [chats, setChats] = useState([])
  const [selectedChat, setSelectedChat] = useState(null)
  const [messages, setMessages] = useState({})
  const [needsResync, setNeedsResync] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const [wallpaper, setWallpaper] = useState(() => {
    try {
      const saved = localStorage.getItem('whatsapp-wallpaper')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('whatsapp-theme')
      return saved ? JSON.parse(saved) : { logoColor: '#5865f2', logoGlow: false, chatScale: 1 }
    } catch {
      return { logoColor: '#5865f2', logoGlow: false, chatScale: 1 }
    }
  })
  const [showWallpaperModal, setShowWallpaperModal] = useState(false)

  useEffect(() => {
    if (wallpaper) {
      localStorage.setItem('whatsapp-wallpaper', JSON.stringify(wallpaper))
    } else {
      localStorage.removeItem('whatsapp-wallpaper')
    }
  }, [wallpaper])

  useEffect(() => {
    localStorage.setItem('whatsapp-theme', JSON.stringify(theme))
  }, [theme])

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onQRCode((data) => {
        setQrCode(data.qr)
      })

      window.electronAPI.onConnectionUpdate((data) => {
        setConnectionState(data.state)
        if (data.state === 'open') {
          setQrCode(null)
        }
      })

      window.electronAPI.onChatsUpdate((data) => {
        setChats(data)
      })

      window.electronAPI.onMessagesUpdate((data) => {
        setMessages(prev => ({
          ...prev,
          [data.jid]: data.messages,
        }))
      })

      window.electronAPI.onNeedsResync(() => {
        setNeedsResync(true)
      })

      window.electronAPI.onUserProfile((data) => {
        setUserProfile(data)
      })

      window.electronAPI.onSelectChat((data) => {
        if (data && data.jid) {
          const chat = chats.find(c => c.id === data.jid)
          if (chat) {
            setSelectedChat(chat)
            window.electronAPI.loadChat(data.jid)
          }
        }
      })
    }
  }, [])

  const handleSelectChat = useCallback(async (chat) => {
    setSelectedChat(chat)
    if (window.electronAPI) {
      await window.electronAPI.loadChat(chat.id)
      await window.electronAPI.markChatRead(chat.id)
    }
  }, [])

  const handleSendMessage = useCallback(async (to, text, quotedMsgId) => {
    if (window.electronAPI) {
      await window.electronAPI.sendMessage(to, text, quotedMsgId)
    }
  }, [])

  const handleSendAudio = useCallback(async (to, audioBase64, mimetype) => {
    if (window.electronAPI) {
      await window.electronAPI.sendAudio(to, audioBase64, mimetype)
    }
  }, [])

  const handleSendFile = useCallback(async (to, file) => {
    if (window.electronAPI) {
      await window.electronAPI.sendFile(to, file)
    }
  }, [])

  const handleLogout = useCallback(async () => {
    if (window.electronAPI) {
      await window.electronAPI.logout()
      setChats([])
      setMessages({})
      setSelectedChat(null)
      setConnectionState('connecting')
      setNeedsResync(false)
      setUserProfile(null)
    }
  }, [])

  const handleRestart = useCallback(async () => {
    if (window.electronAPI) {
      await window.electronAPI.restartApp()
    }
  }, [])

  return (
    <div className="flex h-screen w-screen bg-[#313338] text-white overflow-hidden">
      <QRModal qrCode={qrCode} connectionState={connectionState} />

      {needsResync && connectionState === 'open' && chats.length === 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-[#f23f43] text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3">
          <span className="text-sm font-medium">Nenhuma conversa encontrada.</span>
          <button
            onClick={handleRestart}
            className="bg-white text-[#f23f43] text-xs font-bold px-3 py-1.5 rounded hover:bg-gray-100 transition-colors"
          >
            RECONECTAR
          </button>
          <button
            onClick={() => setNeedsResync(false)}
            className="text-white/80 hover:text-white text-xs"
          >
            ✕
          </button>
        </div>
      )}

      <Sidebar
        chats={chats}
        selectedChat={selectedChat}
        onSelectChat={handleSelectChat}
        userProfile={userProfile}
        onLogout={handleLogout}
        onOpenWallpaper={() => setShowWallpaperModal(true)}
        theme={theme}
        onMarkChatRead={async (jid) => {
          if (window.electronAPI) {
            await window.electronAPI.markChatRead(jid)
          }
        }}
      />
      <ChatView
        chat={selectedChat}
        messages={messages}
        onSendMessage={handleSendMessage}
        onSendFile={handleSendFile}
        onSendAudio={handleSendAudio}
        wallpaper={wallpaper}
        chatScale={theme?.chatScale || 1}
      />
      <WallpaperModal
        isOpen={showWallpaperModal}
        onClose={() => setShowWallpaperModal(false)}
        settings={wallpaper}
        onConfirm={setWallpaper}
        theme={theme}
        onThemeChange={setTheme}
      />
    </div>
  )
}
