# Google Drive KWork

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

## GitHub Pages

1. Разверните `apps-script/Code.gs` и укажите URL в `public/js/config.js` → `appsScriptUrl`
2. Соберите папку для Pages:

```bash
npm run build:pages
```

3. Закоммитьте и запушьте (папка `docs/` попадёт в репозиторий)
4. На GitHub: **Settings → Pages → Branch: `main` → Folder: `/docs` → Save**

Сайт будет доступен по адресу:
`https://dannykgz.github.io/-Google-Drive-KWork-/`

## Структура

```
├── public/           # исходники фронтенда
├── docs/             # сборка для GitHub Pages (генерируется)
├── server.js         # сервер и API (локально / Render)
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
