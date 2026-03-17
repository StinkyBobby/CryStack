FROM node:20-alpine

WORKDIR /app

# Копируем только файлы зависимостей сначала
COPY package.json package-lock.json* ./

# Устанавливаем зависимости
RUN npm install

# Копируем всё остальное
COPY . .

# Открываем порт
EXPOSE 5173

# Запускаем через npm run dev
CMD ["npm", "run", "dev"]