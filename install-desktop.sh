#!/bin/bash

# Script para instalar o atalho .desktop e o ícone do WhatsApp Linux

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APPIMAGE_PATH="$SCRIPT_DIR/dist-electron/WhatsApp Linux-1.0.0.AppImage"
ICON_SRC="$SCRIPT_DIR/assets/icon.png"

# Verifica se o AppImage existe
if [ ! -f "$APPIMAGE_PATH" ]; then
    echo "❌ AppImage não encontrado: $APPIMAGE_PATH"
    echo "   Execute primeiro: npm run dist"
    exit 1
fi

# Verifica se o ícone existe
if [ ! -f "$ICON_SRC" ]; then
    echo "❌ Ícone não encontrado: $ICON_SRC"
    exit 1
fi

# Verifica dependências =====================================================
echo "🔍 Verificando dependências..."

# 1. Chrome/Chromium
CHROME_FOUND=""
for cmd in google-chrome-stable google-chrome chromium chromium-browser; do
    if command -v "$cmd" &> /dev/null; then
        CHROME_FOUND="$cmd"
        break
    fi
done

# Também procura no cache do puppeteer
if [ -z "$CHROME_FOUND" ]; then
    PUPPETEER_CACHE="$HOME/.cache/puppeteer/chrome"
    if [ -d "$PUPPETEER_CACHE" ]; then
        for v in "$PUPPETEER_CACHE"/*/chrome-linux64/chrome; do
            if [ -f "$v" ]; then
                CHROME_FOUND="puppeteer-cache"
                break
            fi
        done
    fi
fi

if [ -z "$CHROME_FOUND" ]; then
    echo ""
    echo "⚠️  ATENÇÃO: Chrome/Chromium não encontrado!"
    echo "   O WhatsApp Linux precisa do Chrome ou Chromium para funcionar."
    echo ""
    echo "   Instale com um dos comandos abaixo (depende da sua distro):"
    echo "     sudo apt install chromium-browser"
    echo "     sudo apt install google-chrome-stable"
    echo "     sudo dnf install chromium"
    echo "     sudo pacman -S chromium"
    echo ""
    echo "   Ou baixe em: https://www.google.com/chrome/"
    echo ""
    read -p "   Deseja continuar a instalação mesmo assim? (s/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo "   Instalação cancelada."
        exit 1
    fi
fi

# 2. libfuse (para AppImage montar)
if ! ldconfig -p | grep -q libfuse; then
    echo ""
    echo "⚠️  ATENÇÃO: libfuse não encontrada!"
    echo "   AppImages precisam do libfuse2 ou libfuse3 para funcionar."
    echo "   Instale com:"
    echo "     sudo apt install libfuse2"
    echo "     sudo dnf install fuse"
    echo ""
    read -p "   Deseja continuar a instalação mesmo assim? (s/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo "   Instalação cancelada."
        exit 1
    fi
fi

# Diretórios de destino
APPS_DIR="$HOME/.local/share/applications"
mkdir -p "$APPS_DIR"

# Instala o ícone original em múltiplos tamanhos na estrutura hicolor
for size in 48 64 128 256 512; do
    ICON_DIR="$HOME/.local/share/icons/hicolor/${size}x${size}/apps"
    mkdir -p "$ICON_DIR"
    cp "$ICON_SRC" "$ICON_DIR/whatsapp-linux.png"
    echo "✅ Ícone ${size}x${size} instalado"
done

# Também instala no diretório de ícones pixmaps (alguns sistemas usam)
PIXMAP_DIR="$HOME/.local/share/pixmaps"
mkdir -p "$PIXMAP_DIR"
cp "$ICON_SRC" "$PIXMAP_DIR/whatsapp-linux.png"
echo "✅ Ícone instalado em pixmaps"

# Gera o .desktop com caminho correto do AppImage
DESKTOP_FILE="$APPS_DIR/whatsapp-linux.desktop"
# Escapa espaços no caminho do AppImage para o formato .desktop
APPIMAGE_ESCAPED="${APPIMAGE_PATH// /\\ }"
cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Name=WhatsApp Linux
Comment=WhatsApp para Linux com interface estilo Discord
Exec=$APPIMAGE_ESCAPED %U
Icon=whatsapp-linux
Type=Application
Categories=Network;Chat;InstantMessaging;
Terminal=false
StartupNotify=true
StartupWMClass=whatsapp-linux
MimeType=x-scheme-handler/whatsapp;
Path=$SCRIPT_DIR
EOF

chmod +x "$DESKTOP_FILE"
echo "✅ Arquivo .desktop criado em: $DESKTOP_FILE"

# Torna o AppImage executável
chmod +x "$APPIMAGE_PATH"
echo "✅ AppImage configurado como executável"

# Atualiza cache de ícones e aplicações
if command -v gtk-update-icon-cache &> /dev/null; then
    gtk-update-icon-cache -f -t "$HOME/.local/share/icons/hicolor" 2>/dev/null || true
fi
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database "$APPS_DIR" 2>/dev/null || true
fi

echo ""
echo "🎉 WhatsApp Linux instalado no menu de aplicativos!"
echo "   Procure por 'WhatsApp Linux' no seu launcher."
if [ -z "$CHROME_FOUND" ]; then
    echo ""
    echo "⚠️  Lembre-se: o app PRECISA do Chrome/Chromium instalado para funcionar!"
fi
