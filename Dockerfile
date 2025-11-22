# Используем Node.js 20
FROM node:20-alpine

# Создаём рабочую папку
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install --production

# Копируем исходники
COPY . .

# Экспонируем порт (для HTTPS)
EXPOSE 5000

# Запускаем сервер
CMD ["node", "server.js"]
