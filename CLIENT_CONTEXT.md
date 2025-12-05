ARCHITECTURE_CONTEXT.md
Project Structure
text

src/
├── pages/                 # Роуты/Controllers
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   └── RegisterPage.tsx
│   ├── services/
│   │   └── ServicesPage.tsx
│   ├── profile/
│   │   └── ProfilePage.tsx
│   └── master/
│       └── MasterDashboardPage.tsx
├── features/              # Бизнес-логика/Services
│   ├── auth/
│   │   ├── components/
│   │   └── hooks/
│   ├── services/
│   │   ├── components/
│   │   └── hooks/
│   └── bookings/
├── components/            # UI компоненты/Шаблоны
│   ├── ui/               # Базовые (Button, Input, Card)
│   ├── layout/           # Header, Footer, Layout
│   └── shared/           # ServiceCard, BookingCard
├── stores/               # Глобальное состояние/Zustand
│   ├── auth.store.ts
│   └── index.ts
├── api/                  # HTTP клиенты
│   ├── client.ts         # Axios instance
│   └── auth/
│       └── auth.api.ts
├── types/                # TypeScript типы/Pydantic модели
│   └── user.types.ts
├── hooks/                # Кастомные хуки/Depends
└── utils/                # Вспомогательные функции

API Endpoints (FastAPI)
Auth

    POST /api/v1/auth/register - регистрация + установка httpOnly куков

    POST /api/v1/auth/token - вход + установка httpOnly куков

    POST /api/v1/auth/refresh - обновление access токена

    GET /api/v1/auth/check - проверка авторизации

    DELETE /api/v1/auth/logout - выход + очистка куков

Users

    GET /api/v1/users/me - полные данные пользователя (включая услуги, записи, шаблоны)

    PATCH /api/v1/users/me - обновление данных

    GET /api/v1/users/{user_id} - данные другого пользователя

Services

    GET /api/v1/services/ - все услуги (нужна пагинация)

    POST /api/v1/services/ - создание услуги

    GET /api/v1/services/{service_id} - детали услуги

    PATCH /api/v1/services/{service_id} - обновление услуги

Enrolls (Бронирования)

    POST /api/v1/enrolls/ - записаться на услугу

    POST /api/v1/enrolls/{enroll_id}/cancel - отменить запись

