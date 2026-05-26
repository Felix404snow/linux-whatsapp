import React, { useState, useEffect, useRef } from 'react'

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function ContextMenu({ x, y, items, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const handleClick = () => onClose()
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    setTimeout(() => {
      window.addEventListener('click', handleClick)
      window.addEventListener('keydown', handleEsc)
    }, 10)
    return () => {
      window.removeEventListener('click', handleClick)
      window.removeEventListener('keydown', handleEsc)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      className="fixed z-[60] bg-[#2b2d31] border border-[#1f2123] rounded-lg shadow-xl py-1 min-w-[160px]"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => { item.onClick(); onClose() }}
          className={`w-full text-left px-3 py-2 text-sm hover:bg-[#5865f2] transition-colors ${
            item.danger ? 'text-[#f23f43] hover:text-white' : 'text-[#dbdee1] hover:text-white'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

export default function Sidebar({
  chats,
  selectedChat,
  onSelectChat,
  userProfile,
  onLogout,
  onOpenWallpaper,
  theme,
  onMarkChatRead,
}) {
  const [contextMenu, setContextMenu] = useState(null)

  const handleContextMenu = (e, chat) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      chat,
    })
  }

  const logoStyle = theme?.logoGlow
    ? {
        backgroundColor: theme.logoColor,
        boxShadow: `0 0 20px ${theme.logoColor}, 0 0 40px ${theme.logoColor}80`,
      }
    : { backgroundColor: theme?.logoColor || '#5865f2' }

  return (
    <div className="w-[72px] bg-[#1e1f22] flex flex-col items-center py-3 flex-shrink-0">
      {/* Logo WhatsApp */}
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2 cursor-pointer hover:rounded-xl transition-all duration-200 shadow-lg"
        style={logoStyle}
      >
        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </div>

      {/* Configurações / Papel de parede */}
      <button
        onClick={onOpenWallpaper}
        className="w-12 h-12 bg-[#313338] rounded-2xl flex items-center justify-center mb-2 cursor-pointer hover:rounded-xl hover:bg-[#5865f2] transition-all duration-200 group shadow-lg"
        title="Papel de parede"
      >
        <svg className="w-6 h-6 text-[#b5bac1] group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      <div className="w-8 h-[2px] bg-[#35363c] rounded-full my-2" />

      {/* Chats como no Discord */}
      <div className="flex-1 flex flex-col items-center gap-2 overflow-y-auto overflow-x-hidden w-full px-2 py-1">
        {chats.slice(0, 20).map(chat => {
          const isSelected = selectedChat?.id === chat.id
          const hasUnread = (chat.unreadCount || 0) > 0
          const name = chat.name || chat.id.split('@')[0]

          return (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat)}
              onContextMenu={(e) => handleContextMenu(e, chat)}
              className="relative group cursor-pointer"
              title={name}
            >
              {chat.profilePic ? (
                <img
                  src={chat.profilePic}
                  alt={name}
                  className={`w-12 h-12 object-cover transition-all duration-200 ${
                    isSelected ? 'rounded-2xl' : 'rounded-3xl group-hover:rounded-2xl'
                  }`}
                />
              ) : (
                <div
                  className={`w-12 h-12 flex items-center justify-center text-xs font-bold text-white transition-all duration-200 ${
                    isSelected ? 'rounded-2xl' : 'rounded-3xl group-hover:rounded-2xl'
                  }`}
                  style={{ backgroundColor: theme?.logoColor || '#5865f2' }}
                >
                  {getInitials(name)}
                </div>
              )}

              {/* Indicador de seleção (barra branca do Discord) */}
              {isSelected && (
                <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
              )}

              {/* Badge de notificação */}
              {hasUnread && !isSelected && (
                <div className="absolute -bottom-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#f23f43] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1 border-2 border-[#1e1f22]">
                  {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                </div>
              )}

              {/* Tooltip */}
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                {name}
              </div>
            </div>
          )
        })}
      </div>

      {/* Perfil do usuário embaixo */}
      <div className="w-full px-3 py-2 mt-2 flex justify-center">
        <div className="h-14 border-t border-[#35363c] flex items-center pt-2">
          {userProfile?.profilePic ? (
            <img src={userProfile.profilePic} alt="Você" className="w-10 h-10 rounded-full object-cover cursor-pointer hover:rounded-xl transition-all duration-200" />
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer hover:rounded-xl transition-all duration-200" style={{ backgroundColor: theme?.logoColor || '#5865f2' }}>
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="w-12 h-12 bg-[#313338] rounded-2xl flex items-center justify-center mb-2 cursor-pointer hover:rounded-xl hover:bg-[#da373c] transition-all duration-200 group"
        title="Sair"
      >
        <svg className="w-6 h-6 text-[#23a55a] group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            {
              label: 'Marcar como lido',
              onClick: () => onMarkChatRead?.(contextMenu.chat.id),
            },
            {
              label: 'Fechar chat',
              onClick: () => {
                if (selectedChat?.id === contextMenu.chat.id) {
                  onSelectChat(null)
                }
              },
              danger: false,
            },
          ]}
        />
      )}
    </div>
  )
}
