# Google Drive Portfolio

Тестовый проект для заказчика с [Kwork](https://kwork.ru).

Лендинг на HTML/CSS/JavaScript с интеграцией Google Drive: файлы из указанной папки автоматически отображаются в блоке «Мои работы» и доступны для скачивания.

## Возможности

- Одностраничный лендинг с разделами: главная, услуги, портфолио, контакты
- Синхронизация файлов из Google Drive
- Автообновление каталога каждые 10 секунд
- Поддержка всех типов файлов
- Иконки по расширению (PDF, Word, Excel, изображения и др.)
- Скачивание и просмотр файлов

## Стек

- Node.js + Express
- Google Drive API или Google Apps Script
- Vanilla HTML / CSS / JavaScript

## Установка

```bash
npm install
cp .env.example .env
```

Заполните `.env`:

```env
GOOGLE_DRIVE_FOLDER_ID=ваш_id_папки
GOOGLE_API_KEY=ваш_api_ключ
PORT=3000
```

Альтернатива без Cloud Console — Google Apps Script (см. `apps-script/Code.gs`):

```env
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
```

## Запуск

```bash
npm start
```

Откройте в браузере адрес из консоли, например: http://localhost:3000

## Структура

```
├── public/           # фронтенд
├── server.js         # сервер и API
├── apps-script/      # скрипт для Google Apps Script
├── .env.example      # пример конфигурации
└── package.json
```

## Настройка Google Drive API

1. [Google Cloud Console](https://console.cloud.google.com/) → создать проект
2. Включить **Google Drive API**
3. Создать **API Key**, ограничить только Drive API
4. Папку на Drive открыть доступом «по ссылке»

## Примечание

Проект создан как демонстрация интеграции для оценки и дальнейшей доработки под задачи заказчика.
