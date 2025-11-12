FROM node:18-alpine

WORKDIR /app

# Копируем package файлы
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install --only=production

# Копируем исходный код
COPY . .

# Создаем не-root пользователя для безопасности
RUN addgroup -g 1001 -S nodejs
RUN adduser -S botuser -u 1001
RUN chown -R botuser:nodejs /app
USER botuser

# Запускаем бота
CMD ["npm", "start"]
