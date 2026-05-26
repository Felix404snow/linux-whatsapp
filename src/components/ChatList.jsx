import React, { useState } from 'react'

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function formatTime(ts) {
  if (!ts) return ''
  const num = typeof ts === 'number' ? ts : parseInt(ts, 10)
  // Detecta se é milissegundos (13 dígitos) ou segundos (10 dígitos)
  const ms = num > 10000000000 ? num : num * 1000
  const date = new Date(ms)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  if (isToday) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export default function ChatList({ chats, selectedChat, onSelectChat, onStartNewChat }) {
  const [search, setSearch] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const [phone, setPhone] = useState('')

  const filtered = chats.filter(c =>
    (c.name || c.id).toLowerCase().includes(search.toLowerCase())
  )

  const handleNewChat = (e) => {
    e.preventDefault()
    if (!phone.trim()) return
    onStartNewChat(phone.trim())
    setPhone('')
    setShowNewChat(false)
  }

  return (
    <div className="w-[280px] bg-[#2b2d31] flex flex-col flex-shrink-0">
      <div className="h-12 flex items-center px-3 border-b border-[#1f2123] shadow-sm gap-2">
        <input
          type="text"
          placeholder="Encontrar ou começar uma conversa"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-[#1e1f22] text-[#dbdee1] text-sm rounded px-3 py-1.5 outline-none placeholder-[#6d6f78] focus:ring-2 focus:ring-[#5865f2]"
        />
        <button
          onClick={() => setShowNewChat(!showNewChat)}
          className="w-8 h-8 bg-[#1e1f22] hover:bg-[#5865f2] rounded flex items-center justify-center text-[#b5bac1] hover:text-white transition-colors"
          title="Nova conversa"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {showNewChat && (
        <form onSubmit={handleNewChat} className="px-3 py-2 border-b border-[#1f2123] bg-[#232428]">
          <div className="text-xs text-[#b5bac1] mb-1.5">Novo chat (número com DDD)</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="5511999999999"
              className="flex-1 bg-[#1e1f22] text-[#dbdee1] text-sm rounded px-3 py-1.5 outline-none placeholder-[#6d6f78] focus:ring-2 focus:ring-[#5865f2]"
              autoFocus
            />
            <button
              type="submit"
              className="bg-[#5865f2] hover:bg-[#4752c4] text-white text-sm font-medium px-3 py-1.5 rounded transition-colors"
            >
              OK
            </button>
          </div>
        </form>
      )}

      <div className="flex-1 overflow-y-auto py-1">
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-[#6d6f78] text-sm">
            Nenhuma conversa encontrada
          </div>
        )}
        {filtered.map(chat => {
          const isSelected = selectedChat?.id === chat.id
          const name = chat.name || chat.id.split('@')[0]

          return (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat)}
              className={`mx-2 px-2 py-2 rounded cursor-pointer flex items-center gap-3 transition-colors ${
                isSelected ? 'bg-[#404249]' : 'hover:bg-[#35363c]'
              }`}
            >
              {chat.profilePic ? (
                <img src={chat.profilePic} alt={name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#5865f2] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {getInitials(name)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#dbdee1] truncate">
                    {name}
                  </span>
                  <span className="text-[10px] text-[#6d6f78] flex-shrink-0 ml-1">
                    {formatTime(chat.conversationTimestamp)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs text-[#6d6f78] truncate">
                    {chat.unreadCount > 0 ? `${chat.unreadCount} nova(s)` : 'Conversa'}
                  </span>
                  {chat.unreadCount > 0 && (
                    <span className="bg-[#f23f43] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>


    </div>
  )
}
