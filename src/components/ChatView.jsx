import React, { useState, useRef, useEffect } from 'react'

function MediaViewer({ media, type, onClose }) {
  if (!media) return null
  return (
    <div
      className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors z-10"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      {type === 'video' ? (
        <video
          src={media}
          controls
          autoPlay
          className="max-w-full max-h-full rounded-lg"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <img
          src={media}
          alt="visualização"
          className="max-w-full max-h-full rounded-lg object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  )
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function linkifyText(text) {
  if (!text) return text
  const urlRegex = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi
  const parts = []
  let lastIndex = 0
  let match

  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={lastIndex}>{text.slice(lastIndex, match.index)}</span>)
    }
    let url = match[0]
    const href = url.startsWith('http') ? url : `https://${url}`
    parts.push(
      <a
        key={match.index}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-blue-300 break-all"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (window.electronAPI?.openExternal) {
            window.electronAPI.openExternal(href)
          } else {
            window.open(href, '_blank')
          }
        }}
      >
        {url}
      </a>
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(<span key={lastIndex}>{text.slice(lastIndex)}</span>)
  }

  return parts.length > 0 ? <>{parts}</> : text
}

function formatMessageTime(ts) {
  if (!ts) return ''
  const num = typeof ts === 'number' ? ts : parseInt(ts, 10)
  // Detecta se é milissegundos (13 dígitos) ou segundos (10 dígitos)
  const ms = num > 10000000000 ? num : num * 1000
  const date = new Date(ms)
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatAudioTime(seconds) {
  if (isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function AudioPlayer({ src, isPtt }) {
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration || 0)
    const onEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', onEnded)
    }
  }, [src])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play().catch(() => {})
      setIsPlaying(true)
    }
  }

  const handleSeek = (e) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pos = (e.clientX - rect.left) / rect.width
    audio.currentTime = Math.max(0, Math.min(duration, pos * duration))
  }

  return (
    <div className={`flex items-center gap-2 ${isPtt ? 'w-56' : 'w-64'}`}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={togglePlay}
        className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 hover:bg-white/30 transition-colors"
      >
        {isPlaying ? (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div
          className="h-1 bg-black/30 rounded-full cursor-pointer relative overflow-hidden"
          onClick={handleSeek}
        >
          <div
            className="absolute top-0 left-0 h-full bg-white/80 rounded-full"
            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="text-[10px] text-white/70">{formatAudioTime(currentTime)}</span>
          <span className="text-[10px] text-white/70">{formatAudioTime(duration)}</span>
        </div>
      </div>
    </div>
  )
}

function getMessageContent(msg, onSaveFile) {
  // Mensagem apagada
  if (msg.type === 'revoked') {
    return <span className="italic text-white">🗑️ Mensagem apagada</span>
  }

  // Visualização única
  if (msg.isViewOnce) {
    return (
      <span className="italic text-white/70 flex items-center gap-1.5">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        {msg.message?.conversation || '👁️ Mídia de visualização única'}
      </span>
    )
  }

  if (msg.media) {
    if (msg.type === 'image' || msg.type === 'sticker') {
      return (
        <div className="relative group">
          <img
            src={msg.media}
            alt="imagem"
            className="max-w-full max-h-64 rounded-lg cursor-pointer"
            onClick={() => setViewerMedia({ type: msg.type === 'video' ? 'video' : 'image', src: msg.media })}
          />
          {onSaveFile && (
            <button
              onClick={(e) => { e.stopPropagation(); onSaveFile(msg.filename || 'imagem.png', msg.media) }}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-black/80"
              title="Salvar imagem"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          )}
        </div>
      )
    }
    if (msg.type === 'video') {
      return (
        <div className="relative group">
          <video
            src={msg.media}
            controls
            className="max-w-full max-h-64 rounded-lg"
          />
          {onSaveFile && (
            <button
              onClick={(e) => { e.stopPropagation(); onSaveFile(msg.filename || 'video.mp4', msg.media) }}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-black/80"
              title="Salvar vídeo"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          )}
        </div>
      )
    }
    if (msg.type === 'audio' || msg.type === 'ptt') {
      return <AudioPlayer src={msg.media} isPtt={msg.type === 'ptt'} />
    }
    // Documentos e outros arquivos — botão de download com Save As
    const fileName = msg.filename || msg.message?.conversation || 'Arquivo'
    const handleSave = async () => {
      if (onSaveFile) {
        await onSaveFile(fileName, msg.media)
      }
    }
    return (
      <button
        onClick={handleSave}
        className="flex items-center gap-2 underline hover:text-white text-left"
      >
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="break-all">{fileName}</span>
      </button>
    )
  }
  if (!msg.message) return 'Mensagem'
  const m = msg.message
  let text = ''
  if (m.conversation) text = m.conversation
  else if (m.extendedTextMessage?.text) text = m.extendedTextMessage.text
  else return 'Mensagem'

  return linkifyText(text)
}

function WallpaperBackground({ wallpaper }) {
  if (!wallpaper?.image) return null
  return (
    <>
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${wallpaper.image})`,
          filter: `brightness(${wallpaper.brightness}%) blur(${wallpaper.blur}px)`,
          transform: 'scale(1.05)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{ backgroundColor: `rgba(0,0,0,${wallpaper.overlayOpacity})` }}
      />
    </>
  )
}

export default function ChatView({ chat, messages, onSendMessage, onSendFile, onSendAudio, wallpaper, chatScale = 1 }) {
  const [text, setText] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const [viewerMedia, setViewerMedia] = useState(null)
  const scrollRef = useRef(null)
  const fileInputRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const rafRef = useRef(null)
  const recordingIntervalRef = useRef(null)
  const name = chat?.name || chat?.id?.split('@')[0] || 'Desconhecido'

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Listener de Ctrl+V / paste
  useEffect(() => {
    const handlePaste = async (e) => {
      if (!chat) return
      const clipboardType = await window.electronAPI.getClipboardType()
      if (clipboardType === 'image') {
        e.preventDefault()
        setIsUploading(true)
        const img = await window.electronAPI.getClipboardImage()
        if (img) {
          await onSendFile(chat.id, img)
        }
        setIsUploading(false)
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [chat, onSendFile])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!text.trim() || !chat) return
    onSendMessage(chat.id, text.trim(), replyingTo?.key?.serializedId)
    setText('')
    setReplyingTo(null)
  }

  const stopRecording = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current)
      recordingIntervalRef.current = null
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    analyserRef.current = null

    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      try { recorder.stop() } catch (err) { console.error('Erro ao parar recorder:', err) }
    }
    setIsRecording(false)
    setRecordingTime(0)
    setAudioLevel(0)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      let mimeType = 'audio/webm'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4'
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = ''
        }
      }
      const options = mimeType ? { mimeType } : {}
      const mediaRecorder = new MediaRecorder(stream, options)
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop())
        if (audioChunksRef.current.length === 0) {
          console.error('Nenhum dado de áudio capturado')
          return
        }
        const finalType = mediaRecorder.mimeType || 'audio/webm'
        const blob = new Blob(audioChunksRef.current, { type: finalType })
        const reader = new FileReader()
        reader.onloadend = async () => {
          const result = reader.result
          if (!result || !result.includes(',')) {
            console.error('FileReader result inválido')
            return
          }
          const base64 = result.split(',')[1]
          if (!base64 || base64.length < 100) {
            console.error('Base64 muito curto ou vazio:', base64?.length)
            return
          }
          console.log('Enviando áudio:', finalType, base64.length, 'chars')
          try {
            await onSendAudio(chat.id, base64, finalType)
          } catch (err) {
            console.error('Erro no onSendAudio:', err)
            alert('Erro ao enviar áudio')
          }
        }
        reader.readAsDataURL(blob)
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

      // Visualizador de áudio
      try {
        const audioCtx = new AudioContext()
        const source = audioCtx.createMediaStreamSource(stream)
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 64
        source.connect(analyser)
        audioContextRef.current = audioCtx
        analyserRef.current = analyser

        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        const draw = () => {
          if (!analyserRef.current) return
          analyserRef.current.getByteFrequencyData(dataArray)
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
          setAudioLevel(average)
          rafRef.current = requestAnimationFrame(draw)
        }
        draw()
      } catch (visualErr) {
        console.log('Visualizador de áudio não disponível:', visualErr.message)
      }
    } catch (err) {
      console.error('Erro ao acessar microfone:', err)
      alert('Não foi possível acessar o microfone')
    }
  }

  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording()
    } else {
      await startRecording()
    }
  }

  const handlePlusClick = async () => {
    if (!chat) return
    const file = await window.electronAPI.selectFile()
    if (file) {
      setIsUploading(true)
      await onSendFile(chat.id, file)
      setIsUploading(false)
    }
  }

  const handleSaveFile = async (defaultName, dataUrl) => {
    try {
      const result = await window.electronAPI.saveFile(defaultName, dataUrl)
      if (result.success) {
        console.log('Arquivo salvo em:', result.path)
      } else if (!result.canceled) {
        alert('Erro ao salvar arquivo: ' + (result.error || 'Desconhecido'))
      }
    } catch (err) {
      console.error('Erro ao salvar:', err)
    }
  }

  const chatMessages = messages[chat?.id] || []

  if (!chat) {
    return (
      <div className="flex-1 bg-[#313338] flex flex-col items-center justify-center relative overflow-hidden">
        <WallpaperBackground wallpaper={wallpaper} />
        <div className="relative z-10 text-[#6d6f78] text-center">
          <svg className="w-32 h-32 mx-auto mb-4 opacity-20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
          </svg>
          <p className="text-lg font-medium">Selecione uma conversa</p>
          <p className="text-sm mt-1">Escolha alguém na lista para começar a conversar</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-[#313338] flex flex-col min-w-0 relative overflow-hidden" style={{ zoom: chatScale }}>
      <WallpaperBackground wallpaper={wallpaper} />
      {/* Header */}
      <div className="relative z-10 h-12 flex items-center px-4 border-b border-[#1f2123]/60 shadow-sm flex-shrink-0 bg-[#313338]/80 backdrop-blur-sm">
        {chat?.profilePic ? (
          <img src={chat.profilePic} alt={name} className="w-8 h-8 rounded-full object-cover mr-3 flex-shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#5865f2] flex items-center justify-center text-xs font-bold text-white mr-3 flex-shrink-0">
            {getInitials(name)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-[#f2f3f5] truncate">{name}</div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto px-4 py-4">
        {chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#6d6f78]">
            <p className="text-sm">Nenhuma mensagem ainda</p>
            <p className="text-xs mt-1">Envie uma mensagem para começar!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {chatMessages.map((msg, i) => {
              const isMe = msg.key.fromMe
              const prev = chatMessages[i - 1]
              const showAvatar = !prev || prev.key.fromMe !== isMe

              return (
                <div key={msg.key.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                    {!isMe && showAvatar && (
                      chat?.profilePic ? (
                        <img src={chat.profilePic} alt={name} className="w-7 h-7 rounded-full object-cover flex-shrink-0 mb-1" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[#5865f2] flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mb-1">
                          {getInitials(name)}
                        </div>
                      )
                    )}
                    {!isMe && !showAvatar && <div className="w-7 flex-shrink-0" />}

                    <div className={`group relative px-3 py-2 rounded-2xl text-sm break-words ${
                      isMe
                        ? 'bg-[#5865f2] text-white rounded-br-md'
                        : 'bg-[#383a40] text-[#dbdee1] rounded-bl-md'
                    }`}>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(msg)}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#1f2123] text-[#b5bac1] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:text-white z-10"
                        title="Responder"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                      </button>
                      {msg.quotedMsg && (
                        <div className={`border-l-2 pl-2 mb-1 text-xs ${isMe ? 'border-white/40 text-white/80' : 'border-[#5865f2] text-[#b5bac1]'}`}>
                          <div className="font-semibold truncate">{msg.quotedMsg.fromMe ? 'Você' : (chat?.name || 'Contato')}</div>
                          {msg.quotedMsg.media && (msg.quotedMsg.type === 'image' || msg.quotedMsg.type === 'sticker') ? (
                            <img src={msg.quotedMsg.media} alt="" className="mt-1 max-h-16 rounded object-cover cursor-pointer" onClick={() => setViewerMedia({ type: 'image', src: msg.quotedMsg.media })} />
                          ) : msg.quotedMsg.media && msg.quotedMsg.type === 'video' ? (
                            <div className="mt-1">🎥 Vídeo</div>
                          ) : msg.quotedMsg.media && (msg.quotedMsg.type === 'audio' || msg.quotedMsg.type === 'ptt') ? (
                            <div className="mt-1">🎵 Áudio</div>
                          ) : (
                            <div className="truncate">
                              {msg.quotedMsg.type === 'image' ? '📷 Imagem' :
                               msg.quotedMsg.type === 'video' ? '🎥 Vídeo' :
                               msg.quotedMsg.type === 'audio' || msg.quotedMsg.type === 'ptt' ? '🎵 Áudio' :
                               msg.quotedMsg.type === 'document' ? '📎 Documento' :
                               msg.quotedMsg.body || 'Mensagem'}
                            </div>
                          )}
                        </div>
                      )}
                      <div>{getMessageContent(msg, handleSaveFile)}</div>
                      <div className={`text-[10px] mt-1 ${isMe ? 'text-blue-200' : 'text-[#6d6f78]'}`}>
                        {formatMessageTime(msg.messageTimestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="relative z-10 px-4 pb-4 pt-2 flex-shrink-0">
        {replyingTo && (
          <div className="bg-[#383a40] rounded-t-lg px-4 py-2 flex items-center gap-2 border-b border-[#1f2123]">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-[#5865f2] font-semibold">Respondendo</div>
              <div className="text-xs text-[#dbdee1] truncate">
                {replyingTo.message?.conversation || replyingTo.message?.extendedTextMessage?.text || 'Mensagem'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="text-[#b5bac1] hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className={`bg-[#383a40] flex items-center px-4 py-2.5 ${replyingTo ? 'rounded-b-lg' : 'rounded-lg'}`}>
          <button
            type="button"
            onClick={handlePlusClick}
            disabled={isUploading || isRecording}
            className="text-[#b5bac1] hover:text-white mr-3 transition-colors disabled:opacity-40"
          >
            {isUploading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            )}
          </button>
          {isRecording ? (
            <div className="flex-1 flex items-center gap-3">
              <div className="flex items-end gap-0.5 h-6">
                {[...Array(8)].map((_, i) => {
                  const factor = 0.3 + 0.7 * Math.abs(Math.sin((i + 1) * 1.3 + recordingTime * 2))
                  const height = Math.max(4, Math.min(24, (audioLevel / 255) * 24 * factor))
                  return (
                    <div
                      key={i}
                      className="w-1 bg-[#f23f43] rounded-full transition-all duration-75"
                      style={{ height: `${height}px` }}
                    />
                  )
                })}
              </div>
              <span className="text-[#f23f43] text-sm font-medium">
                Gravando {formatAudioTime(recordingTime)}
              </span>
            </div>
          ) : (
            <input
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={`Conversar em @${name}`}
              className="flex-1 bg-transparent text-[#dbdee1] text-sm outline-none placeholder-[#6d6f78]"
            />
          )}
          <button
            type="submit"
            className="text-[#b5bac1] hover:text-white ml-3 transition-colors disabled:opacity-30"
            disabled={!text.trim()}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>

      <MediaViewer
        media={viewerMedia?.src}
        type={viewerMedia?.type}
        onClose={() => setViewerMedia(null)}
      />
    </div>
  )
}
