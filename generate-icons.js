const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const SIZES = [48, 64, 128, 256, 512]
const SRC = path.join(__dirname, 'assets/whatsapp-logo-white.svg')
const OUT_DIR = path.join(__dirname, 'assets/icons')

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  // Gera também um PNG grande para o electron-builder
  const large = path.join(__dirname, 'assets/icon.png')
  await sharp(SRC).resize(512, 512).png().toFile(large)
  console.log('✅ icon.png (512x512) ->', large)

  for (const size of SIZES) {
    const dest = path.join(OUT_DIR, `whatsapp-linux-${size}x${size}.png`)
    await sharp(SRC).resize(size, size).png().toFile(dest)
    console.log(`✅ ${size}x${size} -> ${dest}`)
  }
}

main().catch(err => {
  console.error('Erro:', err)
  process.exit(1)
})
