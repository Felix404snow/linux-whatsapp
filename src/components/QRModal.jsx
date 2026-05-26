import React from 'react'

export default function QRModal({ qrCode, connectionState }) {
  if (connectionState === 'open') return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#313338] border border-[#1f2123] rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-2 text-center">
          Conectar ao WhatsApp
        </h2>
        <p className="text-[#b5bac1] text-center mb-6 text-sm">
          {connectionState === 'connecting'
            ? 'Conectando...'
            : 'Escaneie o QR Code com seu WhatsApp para entrar'}
        </p>

        {qrCode ? (
          <div className="flex justify-center">
            <div className="bg-white p-3 rounded-lg">
              <img src={qrCode} alt="QR Code" className="w-64 h-64" />
            </div>
          </div>
        ) : (
          <div className="flex justify-center items-center h-64">
            <div className="w-12 h-12 border-4 border-[#5865f2] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-xs text-[#6d6f78]">
            WhatsApp {'>'} Menu {'>'} Dispositivos vinculados {'>'} Vincular um dispositivo
          </p>
        </div>
      </div>
    </div>
  )
}
