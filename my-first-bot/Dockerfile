FROM node:18-alpine

WORKDIR /app

# Копируем package.json первым для кэширования зависимостей
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install --production

# Копируем исходный код
COPY . .

# Создаем непривилегированного пользователя
RUN addgroup -g 1001 -S nodejs
RUN adduser -S botuser -u 1001

# Меняем владельца файлов
RUN chown -R botuser:nodejs /app

USER botuser

# Запускаем бота
CMD ["node", "bot.js"]
