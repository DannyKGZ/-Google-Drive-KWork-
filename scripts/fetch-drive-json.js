require('dotenv').config();
const fs = require('fs');
const path = require('path');

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '15wuHWn4jrLgd7cfCf1JL5h9Qhu3EIGb6';
const API_KEY = process.env.GOOGLE_API_KEY?.trim();

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

function mapFile(file) {
  return {
    id: file.id,
    name: file.name,
    fileName: file.name,
    mimeType: file.mimeType,
    size: formatFileSize(file.size),
    modifiedTime: file.modifiedTime,
    downloadUrl: `https://drive.google.com/uc?export=download&id=${file.id}`,
    previewUrl: `https://drive.google.com/file/d/${file.id}/preview`,
    webViewLink: file.webViewLink,
  };
}

async function fetchDriveFiles() {
  if (!API_KEY) {
    return null;
  }

  const query = encodeURIComponent(`'${FOLDER_ID}' in parents and trashed=false`);
  const fields = encodeURIComponent('files(id,name,mimeType,size,modifiedTime,webViewLink)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&orderBy=modifiedTime desc&key=${API_KEY}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Drive API error');
  }

  const files = (data.files || [])
    .filter((file) => file.mimeType !== 'application/vnd.google-apps.folder')
    .map(mapFile);

  return {
    configured: true,
    source: 'drive-api',
    folderId: FOLDER_ID,
    updatedAt: new Date().toISOString(),
    files,
  };
}

async function main() {
  const outDir = path.join(__dirname, '..', 'docs', 'data');
  const outFile = path.join(outDir, 'files.json');

  if (!API_KEY) {
    console.log('GOOGLE_API_KEY не задан — пропуск обновления каталога');
    process.exit(0);
  }

  try {
    const payload = await fetchDriveFiles();
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify(payload, null, 2));
    console.log(`Saved ${payload.files.length} files → docs/data/files.json`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

main();
