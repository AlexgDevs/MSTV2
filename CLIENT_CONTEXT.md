ARCHITECTURE_CONTEXT.md
🏗️ Project Structure
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

🔌 API Endpoints (FastAPI)
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

📊 Data Models (TypeScript)
User Types
typescript

interface DetailUserResponse {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin' | 'moderator';
  templates: SimpleUserScheduleTemplate[];
  services: SimpleUserService[];
  services_enroll: SimpleServiceEnroll[];
  tags: SimpleUserTag[];
}

interface SimpleUserService {
  id: number;
  title: string;
  price: number;
  created_at: string;
}

interface SimpleServiceEnroll {
  id: number;
  slot_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'expired';
  price: number;
  service_id: number;
  service_date_id: number;
}

⚙️ Current Implementation Status
✅ Done

    API client setup (Axios + httpOnly cookies)

    Auth store (Zustand)

    TypeScript types from Pydantic models

    Project structure setup

🔜 Next Steps

    Login page UI

    Register page UI

    Main layout with Header

    Router setup

    Services list page

🛠️ Tech Stack

    Frontend: React 18 + TypeScript + Vite

    State Management: Zustand

    HTTP Client: Axios

    Styling: Tailwind CSS

    Routing: React Router

    Backend: FastAPI + HTTPOnly cookies for auth

🔐 Auth Flow

    Регистрация/логин → токены в httpOnly куках

    Все последующие запросы → куки автоматически

    Проверка авторизации через /auth/check

    Выход → очистка куков на сервере

🎯 Key Features Planned

    Маркетплейс услуг с поиском и фильтрами

    Личный кабинет пользователя с записями

    Панель мастера с управлением услугами и расписанием

    Система бронирования с подтверждением

    Чат между клиентом и мастером

ARCHITECTURE_CONTEXT.md - UPDATED
🏗️ Project Structure
text

src/
├── pages/                 # Роуты/Controllers
│   ├── auth/
│   │   ├── LoginPage.tsx ✅
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
├── components/            # UI компоненты/Шаблоны ✅
│   ├── ui/               # Button ✅, Input ✅, Card ✅
│   ├── layout/           # Header, Footer, Layout
│   └── shared/           # ServiceCard, BookingCard
├── stores/               # Глобальное состояние/Zustand ✅
│   ├── auth.store.ts ✅
│   └── index.ts ✅
├── api/                  # HTTP клиенты ✅
│   ├── client.ts ✅
│   └── auth/
│       └── auth.api.ts ✅
├── types/                # TypeScript типы/Pydantic модели ✅
│   └── user.types.ts ✅
├── hooks/                # Кастомные хуки/Depends
└── utils/                # Вспомогательные функции ✅

🔌 API Endpoints (FastAPI)
Auth ✅

    POST /api/v1/auth/register - регистрация + установка httpOnly куков

    POST /api/v1/auth/token - вход + установка httpOnly куков ✅

    POST /api/v1/auth/refresh - обновление access токена

    GET /api/v1/auth/check - проверка авторизации ✅

    DELETE /api/v1/auth/logout - выход + очистка куков

Users

    GET /api/v1/users/me - полные данные пользователя ✅

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

📊 Data Models (TypeScript) ✅
User Types
typescript

interface DetailUserResponse {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin' | 'moderator';
  templates: SimpleUserScheduleTemplate[];
  services: SimpleUserService[];
  services_enroll: SimpleServiceEnroll[];
  tags: SimpleUserTag[];
}

interface SimpleUserService {
  id: number;
  title: string;
  price: number;
  created_at: string;
}

interface SimpleServiceEnroll {
  id: number;
  slot_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'expired';
  price: number;
  service_id: number;
  service_date_id: number;
}

⚙️ Current Implementation Status
✅ Done

    API client setup (Axios + httpOnly cookies) ✅

    Auth store (Zustand) ✅

    TypeScript types from Pydantic models ✅

    Project structure setup ✅

    UI components (Button, Input, Card) ✅

    Login page ✅

    React Router setup ✅

    CORS configured on backend ✅

🔜 Next Steps

    Main Layout with Header

    Register page

    Home page with services list

    Services search and filters

    User profile page

🛠️ Tech Stack

    Frontend: React 18 + TypeScript + Vite ✅

    State Management: Zustand ✅

    HTTP Client: Axios ✅

    Styling: Tailwind CSS ✅

    Routing: React Router ✅

    Backend: FastAPI + HTTPOnly cookies for auth ✅

    CORS: Configured for local development ✅

🔐 Auth Flow ✅

    Регистрация/логин → токены в httpOnly куках ✅

    Все последующие запросы → куки автоматически ✅

    Проверка авторизации через /auth/check ✅

    Выход → очистка куков на сервере

🎯 Key Features Planned

    Маркетплейс услуг с поиском и фильтрами

    Личный кабинет пользователя с записями

    Панель мастера с управлением услугами и расписанием

    Система бронирования с подтверждением

    Чат между клиентом и мастером

🚀 What We Built Today
UI Components ✅

    Button - с вариантами primary/secondary/outline

    Input - с лейблом и обработкой ошибок

    Card - контейнер с header/content

Login Page ✅

    Форма входа с валидацией

    Интеграция с auth store

    Обработка ошибок

    Редирект после успешного входа

Infrastructure ✅

    Роутинг с защищенными маршрутами

    CORS настройка для dev среды

    Глобальное состояние авторизации

NEXT: Main Layout & Header → Home Page → Services List

Обновлено после успешной реализации логина и UI компонентов
