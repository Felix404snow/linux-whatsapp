const { Jimp } = require('jimp')
const path = require('path')
const fs = require('fs')

const SIZES = [48, 64, 128, 256, 512]
const SRC = path.join(__dirname, 'assets/vecteezy_whatsapp-logo-png-whatsapp-icon-png-whatsapp-transparent_18930690.png')
const OUT_DIR = path.join(__dirname, 'assets/icons')

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  for (const size of SIZES) {
    const image = await Jimp.read(SRC)
    image.resize({ w: size, h: size })
    const dest = path.join(OUT_DIR, `whatsapp-linux-${size}x${size}.png`)
    await image.write(dest)
    console.log(`✅ ${size}x${size} -> ${dest}`)
  }
}

main().catch(err => {
  console.error('Erro:', err)
  process.exit(1)
})
