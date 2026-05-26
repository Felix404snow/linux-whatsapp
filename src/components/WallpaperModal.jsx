import React, { useState, useEffect, useRef } from 'react'

const DEFAULT_SETTINGS = {
  image: null,
  brightness: 100,
  overlayOpacity: 0.6,
  blur: 0,
}

const DEFAULT_THEME = {
  logoColor: '#5865f2',
  logoGlow: false,
  chatScale: 1,
}

const PRESET_COLORS = [
  '#5865f2', '#23a55a', '#f23f43', '#f0b232',
  '#eb459f', '#00a8fc', '#9146ff', '#ff7328',
  '#ffffff', '#000000',
]

export default function WallpaperModal({
  isOpen,
  onClose,
  settings,
  onConfirm,
  theme,
  onThemeChange,
}) {
  const [preview, setPreview] = useState(settings || DEFAULT_SETTINGS)
  const [localTheme, setLocalTheme] = useState(theme || DEFAULT_THEME)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setPreview(settings || DEFAULT_SETTINGS)
      setLocalTheme(theme || DEFAULT_THEME)
    }
  }, [isOpen, settings, theme])

  if (!isOpen) return null

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(prev => ({ ...prev, image: reader.result }))
    }
    reader.readAsDataURL(file)
  }

  const handleConfirm = () => {
    onConfirm(preview)
    onThemeChange(localTheme)
    onClose()
  }

  const handleRemove = () => {
    onConfirm(DEFAULT_SETTINGS)
    onClose()
  }

  const logoPreviewStyle = localTheme.logoGlow
    ? {
        backgroundColor: localTheme.logoColor,
        boxShadow: `0 0 20px ${localTheme.logoColor}, 0 0 40px ${localTheme.logoColor}80`,
      }
    : { backgroundColor: localTheme.logoColor }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#2b2d31] rounded-xl shadow-2xl w-[460px] max-w-[92vw] max-h-[85vh] overflow-y-auto border border-[#1f2123]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1f2123] flex items-center justify-between sticky top-0 bg-[#2b2d31] z-10">
          <h2 className="text-base font-semibold text-[#f2f3f5]">Configurações</h2>
          <button onClick={onClose} className="text-[#b5bac1] hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-6">
          {/* Cor do Logo */}
          <div>
            <h3 className="text-sm font-semibold text-[#f2f3f5] mb-3">Cor do botão WhatsApp</h3>
            <div className="flex items-center gap-4 mb-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200"
                style={logoPreviewStyle}
              >
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="color"
                    value={localTheme.logoColor}
                    onChange={(e) => setLocalTheme(prev => ({ ...prev, logoColor: e.target.value }))}
                    className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                  />
                  <span className="text-xs text-[#b5bac1] font-mono uppercase">{localTheme.logoColor}</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localTheme.logoGlow}
                    onChange={(e) => setLocalTheme(prev => ({ ...prev, logoGlow: e.target.checked }))}
                    className="w-4 h-4 rounded accent-[#5865f2]"
                  />
                  <span className="text-xs text-[#dbdee1]">Efeito brilhando</span>
                </label>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setLocalTheme(prev => ({ ...prev, logoColor: color }))}
                  className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                    localTheme.logoColor === color ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="h-[1px] bg-[#35363c]" />

          {/* Escala do Chat */}
          <div>
            <h3 className="text-sm font-semibold text-[#f2f3f5] mb-3">Escala do chat</h3>
            <div>
              <div className="flex justify-between text-xs text-[#b5bac1] mb-1.5">
                <span>Tamanho das mensagens</span>
                <span>{Math.round((localTheme.chatScale || 1) * 100)}%</span>
              </div>
              <input
                type="range"
                min={80}
                max={150}
                value={Math.round((localTheme.chatScale || 1) * 100)}
                onChange={(e) => setLocalTheme(prev => ({ ...prev, chatScale: Number(e.target.value) / 100 }))}
                className="w-full h-1.5 bg-[#1f2123] rounded-lg appearance-none cursor-pointer accent-[#5865f2]"
              />
            </div>
          </div>

          <div className="h-[1px] bg-[#35363c]" />

          {/* Papel de parede */}
          <div>
            <h3 className="text-sm font-semibold text-[#f2f3f5] mb-3">Papel de parede</h3>
            <div className="w-full h-40 rounded-lg border border-[#1f2123] overflow-hidden relative bg-[#313338]">
              {preview.image ? (
                <>
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${preview.image})`,
                      filter: `brightness(${preview.brightness}%) blur(${preview.blur}px)`,
                      transform: 'scale(1.05)',
                    }}
                  />
                  <div
                    className="absolute inset-0"
                    style={{ backgroundColor: `rgba(0,0,0,${preview.overlayOpacity})` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm text-white/70 font-medium drop-shadow">Pré-visualização</span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#6d6f78] text-sm">
                  Nenhuma imagem selecionada
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 w-full py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white text-sm font-medium rounded-lg transition-colors"
            >
              {preview.image ? 'Trocar imagem' : 'Escolher imagem'}
            </button>

            <div className="mt-4 space-y-4">
              <div>
                <div className="flex justify-between text-xs text-[#b5bac1] mb-1.5">
                  <span>Brilho da imagem</span>
                  <span>{preview.brightness}%</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={200}
                  value={preview.brightness}
                  onChange={(e) => setPreview(prev => ({ ...prev, brightness: Number(e.target.value) }))}
                  className="w-full h-1.5 bg-[#1f2123] rounded-lg appearance-none cursor-pointer accent-[#5865f2]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-[#b5bac1] mb-1.5">
                  <span>Escurecer fundo</span>
                  <span>{Math.round(preview.overlayOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={90}
                  value={Math.round(preview.overlayOpacity * 100)}
                  onChange={(e) => setPreview(prev => ({ ...prev, overlayOpacity: Number(e.target.value) / 100 }))}
                  className="w-full h-1.5 bg-[#1f2123] rounded-lg appearance-none cursor-pointer accent-[#5865f2]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-[#b5bac1] mb-1.5">
                  <span>Desfoque</span>
                  <span>{preview.blur}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={20}
                  value={preview.blur}
                  onChange={(e) => setPreview(prev => ({ ...prev, blur: Number(e.target.value) }))}
                  className="w-full h-1.5 bg-[#1f2123] rounded-lg appearance-none cursor-pointer accent-[#5865f2]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#1f2123] flex gap-2 justify-end sticky bottom-0 bg-[#2b2d31]">
          {preview.image && (
            <button
              onClick={handleRemove}
              className="px-4 py-2 text-sm font-medium text-[#f23f43] hover:text-[#ff4d4d] transition-colors rounded-lg hover:bg-[#f23f43]/10"
            >
              Remover
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#dbdee1] hover:text-white transition-colors rounded-lg hover:bg-[#35363c]"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium bg-[#5865f2] hover:bg-[#4752c4] text-white rounded-lg transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
