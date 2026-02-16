crystack/
├── cmd/
│   └── api/
│       └── main.go                    # ТОЛЬКО запуск роутера
├── internal/
│   ├── config/
│   │   └── config.go                  # Загрузка .env
│   ├── handlers/                      # ВСЕ роуты + обработчики
│   │   ├── auth_routes.go            # /api/auth/*
│   │   ├── player_routes.go          # /api/players/*
│   │   ├── team_routes.go            # /api/teams/*
│   │   ├── search_routes.go          # /api/search/*
│   │   ├── match_routes.go           # /api/matches/*
│   │   └── routes.go                 # RegisterRoute (r *gin.Engine)
│   ├── services/
│   │   ├── auth.go                   # Steam OpenID логика
│   │   ├── player.go                 # OpenDota анализ
│   │   ├── team.go                   # Matchmaking алгоритм
│   │   └── steam.go                  # Steam API клиент
│   ├── repository/
│   │   ├── player.go                 # БД операции Player
│   │   └── team.go                   # БД операции Team
│   └── models/
│       ├── player.go                 # struct Player
│       └── team.go                   # struct Team
├── .env                              # STEAM_API_KEY
├── go.mod
└── README.md


cmd/api/ — точка входа приложения (main.go). Здесь запускается сервер, инициализируются зависимости, роуты и т.д.
internal/config/ — работа с конфигами и переменными окружения (.env loader, config.go). Всё, что связано с настройками приложения.
internal/models/ — описания структур данных (Player, Team, Session). Это отражение таблиц БД и объектов, с которыми работает бизнес-логика.
internal/repository/ — слой доступа к данным (CRUD-операции с БД). Здесь интерфейсы и их реализации для работы с моделями через ORM.
internal/handlers/ — обработчики HTTP-запросов (роуты). Здесь функции, которые принимают запросы, вызывают сервисы/репозитории и возвращают ответы.
internal/services/ — бизнес-логика и интеграция с внешними сервисами (Steam, OpenDota). Здесь код, который получает и обрабатывает данные не из БД, а из внешних API.
pkg/db/ — инициализация и конфигурация подключения к базе данных (sqlx, GORM и т.д.).
pkg/jwt/ — работа с JWT-токенами (создание, валидация и т.д.).
pkg/middleware/ — промежуточные обработчики для Gin (например, аутентификация, CORS).
sql/ — миграции для базы данных (создание и изменение таблиц).
go.mod — файл зависимостей Go.
.env — переменные окружения (ключи, строки подключения и т.д.).

Взаимодействие:

handlers принимают запросы, вызывают методы services или repository.
services используют repository для работы с БД и сами ходят во внешние API.
repository напрямую работают с БД через модели.
models описывают структуру данных для всех слоёв.
pkg/db отвечает за подключение к БД, pkg/jwt и pkg/middleware — за вспомогательные функции.
Такой подход делает проект модульным, удобным для тестирования и масштабирования. Если нужно подробнее по какой-то папке — спрашивай!