# WebSocket Endpoints

Эта папка содержит реализацию WebSocket соединений для чатов в приложении.

## Структура

- `connection_manager.py` - Менеджер для управления активными WebSocket соединениями
- `auth.py` - Утилита для аутентификации WebSocket соединений
- `service_chat.py` - WebSocket endpoint для чатов между мастером и клиентом
- `support_chat.py` - WebSocket endpoint для чатов между саппортом и клиентом
- `routers.py` - Роутеры для подключения WebSocket endpoints к приложению

## Endpoints

### Service Chat (Мастер-Клиент)

**URL:** `ws://localhost:8000/ws/service-chats/{chat_id}?token={access_token}`

Или токен можно передать через cookie `access_token`.

**Формат сообщений:**

От клиента:

```json
{
  "type": "message",
  "content": "Текст сообщения"
}
```

От сервера:

```json
{
  "type": "message",
  "id": 1,
  "content": "Текст сообщения",
  "sender_id": 1,
  "chat_id": 1,
  "created_at": "2024-01-01T12:00:00"
}
```

### Support Chat (Саппорт-Клиент)

**URL:** `ws://localhost:8000/ws/support-chats/{chat_id}?token={access_token}`

Или токен можно передать через cookie `access_token`.

**Формат сообщений:** Аналогично Service Chat

## Особенности

1. **Аутентификация:** Токен передается через query параметр `token` или cookie `access_token`
2. **Проверка доступа:** Автоматически проверяется, что пользователь является участником чата
3. **Broadcast:** Сообщения автоматически отправляются всем участникам чата (кроме отправителя)
4. **Heartbeat:** Поддерживается ping/pong для поддержания соединения

## Использование на фронтенде

Пример подключения (JavaScript):

```javascript
const token = "your_access_token";
const chatId = 1;
const ws = new WebSocket(
  `ws://localhost:8000/ws/service-chats/${chatId}?token=${token}`
);

ws.onopen = () => {
  console.log("Connected");
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Received:", data);
};

// Отправка сообщения
ws.send(
  JSON.stringify({
    type: "message",
    content: "Привет!",
  })
);
```
