const { Jimp } = require('jimp')
const path = require('path')

async function resize() {
  const src = path.join(__dirname, 'assets/vecteezy_whatsapp-logo-png-whatsapp-icon-png-whatsapp-transparent_18930690.png')
  const dest = path.join(__dirname, 'assets/icon-512x512.png')

  const image = await Jimp.read(src)
  image.resize({ w: 512, h: 512 })
  await image.write(dest)
  console.log(`✅ Ícone redimensionado: ${dest} (512x512)`)
}

resize().catch(err => {
  console.error('Erro ao redimensionar ícone:', err)
  process.exit(1)
})
