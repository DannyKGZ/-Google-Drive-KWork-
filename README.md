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

Сайт: https://dannykgz.github.io/-Google-Drive-KWork-/

На Pages нет Node-сервера — каталог файлов хранится в `data/files.json` и обновляется автоматически.

### Настройка (один раз)

1. GitHub → **Settings → Secrets and variables → Actions**
2. Добавьте секреты:
   - `GOOGLE_API_KEY` — API-ключ Google Drive
   - `GOOGLE_DRIVE_FOLDER_ID` — ID папки (`15wuHWn4jrLgd7cfCf1JL5h9Qhu3EIGb6`)
3. **Settings → Pages** → Branch: `main`, Folder: `/docs`
4. Вкладка **Actions** → workflow **Update Drive catalog** → **Run workflow**

Workflow обновляет каталог каждые 5 минут и при каждом push в код.

### Обновить каталог вручную

```bash
npm run fetch:drive
git add docs/data/files.json
git commit -m "Update catalog"
git push
```

## Структура

```
├── docs/             # фронтенд (сайт + GitHub Pages)
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── data/files.json
├── server.js         # локальный сервер + API
├── apps-script/
├── .env.example
└── package.json
```

## Настройка Google Drive API

1. [Google Cloud Console](https://console.cloud.google.com/) → создать проект
2. Включить **Google Drive API**
3. Создать **API Key**, ограничить только Drive API
4. Папку на Drive открыть доступом «по ссылке»

## Примечание

Проект создан как демонстрация интеграции для оценки и дальнейшей доработки под задачи заказчика.
