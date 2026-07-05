require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '15wuHWn4jrLgd7cfCf1JL5h9Qhu3EIGb6';
const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL;
const RAW_API_KEY = process.env.GOOGLE_API_KEY?.trim();
const PLACEHOLDER_KEYS = new Set(['', 'your_google_api_key_here', 'YOUR_API_KEY']);
const API_KEY = RAW_API_KEY && !PLACEHOLDER_KEYS.has(RAW_API_KEY) ? RAW_API_KEY : null;

app.use(express.static(path.join(__dirname, 'public')));

function formatFileSize(bytes) {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = Number(bytes);
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function getDownloadUrl(fileId) {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

function getPreviewUrl(fileId) {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

function mapDriveApiFile(file) {
  return {
    id: file.id,
    name: file.name,
    fileName: file.name,
    mimeType: file.mimeType,
    size: formatFileSize(file.size),
    modifiedTime: file.modifiedTime,
    downloadUrl: getDownloadUrl(file.id),
    previewUrl: getPreviewUrl(file.id),
    webViewLink: file.webViewLink,
  };
}

function isFolder(file) {
  return file.mimeType === 'application/vnd.google-apps.folder';
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data.error?.message || data.error || `HTTP ${response.status}`;
      throw new Error(message);
    }

    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Таймаут при обращении к Google. Проверьте интернет или VPN.');
    }
    if (err.message === 'fetch failed') {
      throw new Error(
        'Не удалось подключиться к Google API. Проверьте интернет/VPN или используйте GOOGLE_APPS_SCRIPT_URL (см. apps-script/Code.gs).'
      );
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchFromAppsScript() {
  const data = await fetchJson(APPS_SCRIPT_URL);
  return {
    configured: true,
    source: 'apps-script',
    files: data.files || [],
    folderId: data.folderId || FOLDER_ID,
  };
}

async function fetchFromDriveApi() {
  const query = encodeURIComponent(`'${FOLDER_ID}' in parents and trashed=false`);
  const fields = encodeURIComponent('files(id,name,mimeType,size,modifiedTime,webViewLink)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&orderBy=modifiedTime desc&key=${API_KEY}`;

  const data = await fetchJson(url);

  const files = (data.files || [])
    .filter((file) => !isFolder(file))
    .map(mapDriveApiFile);

  return { configured: true, source: 'drive-api', files, folderId: FOLDER_ID };
}

async function fetchDriveFiles() {
  if (APPS_SCRIPT_URL) {
    return fetchFromAppsScript();
  }

  if (!API_KEY) {
    return {
      configured: false,
      error: 'Не задан ключ. Укажите GOOGLE_APPS_SCRIPT_URL или GOOGLE_API_KEY в файле .env и перезапустите сервер.',
      files: [],
    };
  }

  if (!API_KEY.startsWith('AIza')) {
    throw new Error('GOOGLE_API_KEY выглядит неверно. Ключ должен начинаться с AIza...');
  }

  return fetchFromDriveApi();
}

app.get('/api/works', async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const result = await fetchDriveFiles();
    res.json(result);
  } catch (err) {
    res.status(500).json({
      configured: Boolean(API_KEY),
      error: err.message,
      files: [],
    });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function startServer(port, attemptsLeft = 10) {
  const server = app.listen(port, () => {
    console.log(`Сервер: http://localhost:${port}`);
    if (port !== Number(process.env.PORT || 3000)) {
      console.warn(`Порт ${process.env.PORT || 3000} был занят — используется ${port}.`);
    }
    if (!API_KEY && !APPS_SCRIPT_URL) {
      console.warn('⚠ Не задан GOOGLE_APPS_SCRIPT_URL или GOOGLE_API_KEY — блок «Мои работы» покажет инструкцию.');
    } else if (APPS_SCRIPT_URL) {
      console.log('✓ Источник файлов: Google Apps Script');
    } else {
      console.log('✓ Источник файлов: Google Drive API');
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
      console.warn(`Порт ${port} занят, пробуем ${port + 1}...`);
      startServer(port + 1, attemptsLeft - 1);
      return;
    }

    if (err.code === 'EADDRINUSE') {
      console.error(`Ошибка: порты ${PORT}–${port} заняты. Закройте другой процесс или задайте PORT в .env`);
    } else {
      console.error('Ошибка запуска сервера:', err.message);
    }
    process.exit(1);
  });
}

startServer(Number(PORT));
