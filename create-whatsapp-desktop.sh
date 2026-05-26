#!/bin/bash

# Cria um atalho .desktop para o WhatsApp Linux com ícone customizado
# Uso: ./create-whatsapp-desktop.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
START_SCRIPT="$SCRIPT_DIR/start.sh"
ICON_SRC="$SCRIPT_DIR/assets/vecteezy_whatsapp-logo-png-whatsapp-icon-png-whatsapp-transparent_18930690.png"

# Verifica se o start.sh existe
if [ ! -f "$START_SCRIPT" ]; then
    echo "❌ start.sh não encontrado: $START_SCRIPT"
    exit 1
fi

# Verifica se o ícone existe
if [ ! -f "$ICON_SRC" ]; then
    echo "❌ Ícone não encontrado: $ICON_SRC"
    exit 1
fi

# Diretórios de destino
APPS_DIR="$HOME/.local/share/applications"
ICONS_DIR="$HOME/.local/share/icons"
mkdir -p "$APPS_DIR"
mkdir -p "$ICONS_DIR"

# Copia o ícone para o diretório de ícones do usuário
ICON_DEST="$ICONS_DIR/whatsapp.png"
cp "$ICON_SRC" "$ICON_DEST"
echo "✅ Ícone copiado para: $ICON_DEST"

# Torna o start.sh executável
chmod +x "$START_SCRIPT"
echo "✅ start.sh configurado como executável"

# Cria o arquivo .desktop
DESKTOP_FILE="$APPS_DIR/whatsapp.desktop"
cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Name=whatsapp
Comment=WhatsApp para Linux
Exec=$START_SCRIPT
Icon=$ICON_DEST
Type=Application
Categories=Network;Chat;InstantMessaging;
Terminal=false
StartupNotify=true
StartupWMClass=whatsapp
Path=$SCRIPT_DIR
EOF

chmod +x "$DESKTOP_FILE"
echo "✅ Arquivo .desktop criado em: $DESKTOP_FILE"

# Atualiza cache de aplicações
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database "$APPS_DIR" 2>/dev/null || true
    echo "✅ Cache de aplicações atualizado"
fi

echo ""
echo "🎉 Atalho criado com sucesso!"
echo "   Procure por 'whatsapp' no menu de aplicativos."
