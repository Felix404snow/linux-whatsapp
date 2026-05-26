# Como enviar para o GitHub

## 1. Instalar o Git (se não tiver)

```bash
sudo apt install git
```

## 2. Configurar o Git (primeira vez)

```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu@email.com"
```

## 3. Inicializar o repositório

Dentro da pasta `whatsapp-linux`:

```bash
cd /caminho/para/whatsapp-linux
git init
git add .
git commit -m "Primeiro commit - WhatsApp Linux"
```

## 4. Criar repositório no GitHub

1. Acesse https://github.com/new
2. Nome do repositório: `whatsapp-linux` (ou o que quiser)
3. NÃO marque "Initialize this repository with a README"
4. Clique em **Create repository**

## 5. Enviar o código

Copie os comandos que o GitHub mostrar (será algo assim):

```bash
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/whatsapp-linux.git
git push -u origin main
```

---

## ⚠️ O que NÃO vai pro GitHub (já está no .gitignore)

- `node_modules/` (844MB de dependências)
- `dist/` e `dist-electron/` (builds e AppImage)
- `squashfs-root/` (extração do AppImage)
- `.wwebjs_cache/` (cache do WhatsApp Web)

Isso faz o repositório ficar leve! Quem baixar só precisa rodar `npm install` e `npm run dist`.
