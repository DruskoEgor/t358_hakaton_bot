# Добробот 🤖

Бот для быстрого волонтерства на районе. Помогает соединить людей, которым нужна помощь, с теми, кто готов помочь.

## 🚀 Быстрый старт

### Способ 1: Локальный запуск (Arch Linux)

```bash
# Установите Node.js и npm
sudo pacman -Syu
sudo pacman -S nodejs npm

# Создайте папку для бота
mkdir my-first-bot
cd my-first-bot

# Установите зависимости
npm install --save @maxhub/max-bot-api

# Скопируйте файлы бота в папку:
# - bot.js
# - data.json

# Запустите бота
BOT_TOKEN="токен_бота" node bot.js
```

### Способ 2: запуск через Docker (Arch Linux)

```bash
# Установите Docker
sudo pacman -Syu
sudo pacman -S docker

# Создайте папку для бота и перейдите в нее
mkdir my-first-bot
cd my-first-bot

# запустите и разрешите действия docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# Скопируйте файлы бота в папку:
# - bot.js
# - data.json
# - package.json
# - Dockerfile

# Запустите бота
docker build -t bot .
docker run -e BOT_TOKEN="токен_бота" bot
```
