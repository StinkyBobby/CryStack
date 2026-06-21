# CryStack

CryStack — веб-платформа для поиска команд и аналитики по Dota 2. Проект состоит из бэкенда на Go и фронтенда на React.

## Стек технологий

**Бэкенд:**
- Go 1.25.4
- Gin (HTTP-фреймворк)
- GORM (ORM для работы с базой данных)
- PostgreSQL 15
- JWT-аутентификация через Steam

**Фронтенд:**
- React 18 + TypeScript
- Vite (сборка)
- Tailwind CSS (стилизация)
- Three.js / React Three Fiber (3D-анимации)
- Framer Motion (анимации)
- Lucide React (иконки)

## Структура проекта

```
CryStack/
├── backend/       # Go-бэкенд
│   ├── cmd/       # Точка входа приложения
│   ├── internal/  # Бизнес-логика, модели, репозитории, хендлеры
│   ├── pkg/       # Публичные пакеты (middleware и т.д.)
│   └── tests/     # Тесты
├── frontend/      # React-фронтенд
│   ├── src/
│   │   ├── api/       # HTTP-клиент
│   │   ├── components/    # UI-компоненты
│   │   ├── hooks/         # React-хуки
│   │   ├── pages/         # Страницы приложения
│   │   └── types/         # TypeScript-типы
│   └── public/        # Статические файлы
└── docker-compose.yml     # Конфигурация Docker
```

## Запуск

### Предварительные требования

- Docker и Docker Compose
- Файл `.env` в корне проекта с переменными окружения

### Переменные окружения

Создайте файл `.env` в корневой директории:

```env
PORT=8080
VITE_PORT=3000
DB_URL=postgres://postgres:1234@db:5432/crystack
STEAM_API_KEY=your_steam_api_key
JWT_SECRET=your_jwt_secret
DOMAIN=localhost
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8080
VITE_API_URL=http://localhost:8080
```

### Запуск через Docker

```bash
docker-compose up --build
```

После запуска:
- Фронтенд доступен на `http://localhost:3000`
- Бэкенд доступен на `http://localhost:8080`
- База данных PostgreSQL на `localhost:5432`

### Локальная разработка бэкенда

```bash
cd backend
go mod download
go run ./cmd/main.go
```

### Локальная разработка фронтенда

```bash
cd frontend
npm install
npm run dev
```

## API

### Аутентификация

Аутентификация осуществляется через Steam OpenID. После успешного входа клиент получает JWT-токен, который передается в заголовке `Authorization: Bearer <token>`.

### Основные эндпоинты

**Игроки:**
- `GET /api/players/:steam_id` — получить данные игрока
- `PUT /api/players/:steam_id/refresh` — обновить данные игрока из OpenDota

**Команды:**
- `GET /api/teams` — список команд
- `POST /api/teams` — создать команду
- `GET /api/teams/mine` — команды текущего пользователя

**Приглашения:**
- `GET /api/invites/my` — входящие приглашения пользователя
- `POST /api/invites` — отправить приглашение
- `PATCH /api/invites/:id/respond` — принять или отклонить приглашение
- `DELETE /api/invites/:id` — отозвать приглашение

## База данных

Подключение к PostgreSQL:

- Хост: `localhost:5432`
- База: `crystack`
- Пользователь: `postgres`
- Пароль: `1234`

## Тестирование

```bash
cd backend
go test ./...
```

## Лицензия

Проект распространяется под лицензией MIT.
