# WhatsApp Linux

WhatsApp para Linux com interface estilo Discord, feito com Electron + React + whatsapp-web.js.

![Interface](assets/icon.png)

## ✨ Funcionalidades

- ✅ Login via QR Code (igual WhatsApp Web)
- ✅ Interface estilo Discord (sidebar, lista de chats, área de mensagens)
- ✅ Enviar e receber mensagens de texto, imagens, vídeos, áudios e documentos
- ✅ Lista de conversas com contador de não lidas
- ✅ **Marcar como lido** automaticamente ao abrir o chat ou pelo botão direito
- ✅ **Botão direito** na foto do chat → "Marcar como lido" e "Fechar chat"
- ✅ **Papel de parede personalizado** no fundo do chat (com brilho, escurecimento e desfoque)
- ✅ **Cor do botão WhatsApp** customizável + efeito brilhando
- ✅ **Escala do chat** ajustável (aumentar/diminuir texto das mensagens)
- ✅ Notificações nativas do Linux com som
- ✅ AppImage pronto para executar

## 🚀 Como usar

### ⚠️ Pré-requisito

Você precisa ter o **Google Chrome** ou **Chromium** instalado, pois o app usa o WhatsApp Web por baixo dos panos.

```bash
sudo apt install chromium-browser
# ou
sudo apt install google-chrome-stable
```

### 1. Baixe e execute

```bash
chmod +x "dist-electron/WhatsApp Linux-1.0.0.AppImage"
./"dist-electron/WhatsApp Linux-1.0.0.AppImage"
```

Ou clique duas vezes no arquivo no seu gerenciador de arquivos.

### 2. Criar atalho no menu de aplicativos

```bash
./create-whatsapp-desktop.sh
```

Isso cria um atalho chamado **"whatsapp"** no menu de aplicativos do Linux, com o ícone correto.

> 💡 O atalho executa o `start.sh` que roda o AppImage automaticamente.

### 3. Login

1. Abra o app
2. Escaneie o QR Code com seu WhatsApp: **Menu → Dispositivos vinculados → Vincular um dispositivo**
3. Pronto! Suas conversas aparecerão automaticamente

## ⚙️ Configurações

Clique na **engrenagem** (abaixo do botão do WhatsApp na sidebar) para abrir as configurações:

- **Papel de parede** — escolha uma imagem e ajuste brilho, escurecimento e desfoque
- **Cor do botão WhatsApp** — escolha qualquer cor + efeito brilhando
- **Escala do chat** — aumente ou diminua o tamanho das mensagens

> 💾 Todas as configurações ficam salvas no `localStorage` do app (persistem entre aberturas).

## 🛠️ Desenvolvimento

```bash
# Instalar dependências
npm install

# Rodar em modo desenvolvimento
npm run dev

# Build do frontend
npm run build

# Gerar AppImage
npm run dist
```

## 📁 Onde ficam salvas as coisas

| O quê | Onde fica |
|-------|-----------|
| Configurações (papel de parede, cor, escala) | `localStorage` do Electron |
| Autenticação do WhatsApp | `~/.whatsapp-linux-auth-wwebjs/` |
| Cache de conversas | `~/.whatsapp-linux-auth-wwebjs/store.json` |
| Ícone do atalho desktop | `~/.local/share/icons/whatsapp.png` |
| Atalho .desktop | `~/.local/share/applications/whatsapp.desktop` |

## 🧹 Limpar cache / deslogar

Para deslogar e apagar todos os dados salvos:

```bash
rm -rf ~/.whatsapp-linux-auth-wwebjs/
```

## 🛡️ Tecnologias

- **Electron** — Desktop app
- **React + Vite** — Interface
- **Tailwind CSS** — Estilização estilo Discord
- **whatsapp-web.js** — Conexão com WhatsApp via Puppeteer
- **electron-builder** — Geração do AppImage

## 📜 Aviso

Este projeto usa a biblioteca `whatsapp-web.js` para se conectar ao WhatsApp. **Não é afiliado ao WhatsApp Inc.**
