const FILE_TYPE_MAP = {
  pdf: 'pdf',
  doc: 'word',
  docx: 'word',
  rtf: 'word',
  odt: 'word',
  xls: 'excel',
  xlsx: 'excel',
  csv: 'excel',
  ods: 'excel',
  ppt: 'powerpoint',
  pptx: 'powerpoint',
  odp: 'powerpoint',
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',
  bmp: 'image',
  zip: 'archive',
  rar: 'archive',
  '7z': 'archive',
  tar: 'archive',
  gz: 'archive',
  mp4: 'video',
  avi: 'video',
  mov: 'video',
  mkv: 'video',
  webm: 'video',
  mp3: 'audio',
  wav: 'audio',
  ogg: 'audio',
  flac: 'audio',
  txt: 'text',
  md: 'text',
  json: 'code',
  js: 'code',
  ts: 'code',
  html: 'code',
  css: 'code',
};

const FILE_TYPE_COLORS = {
  pdf: '#E74C3C',
  word: '#2B579A',
  excel: '#217346',
  powerpoint: '#D24726',
  image: '#8E44AD',
  archive: '#B7950B',
  video: '#E84393',
  audio: '#00B894',
  text: '#636E72',
  code: '#0984E3',
  default: '#5B8CFF',
};

function getExtension(fileName) {
  if (!fileName || !fileName.includes('.')) return '';
  return fileName.split('.').pop().toLowerCase();
}

function getFileType(fileName) {
  const ext = getExtension(fileName);
  return FILE_TYPE_MAP[ext] || 'default';
}

function renderFileIcon(fileName) {
  const ext = getExtension(fileName);
  const type = getFileType(fileName);
  const color = FILE_TYPE_COLORS[type] || FILE_TYPE_COLORS.default;
  const label = (ext || 'file').slice(0, 4).toUpperCase();

  return `
    <span class="file-icon file-icon--${type}" aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 4h18l10 10v30a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="#2A3144"/>
        <path d="M30 4v10h10" fill="#3D4660"/>
        <rect x="8" y="22" width="32" height="16" rx="3" fill="${color}"/>
        <text x="24" y="33" text-anchor="middle" fill="#fff" font-size="9" font-weight="700" font-family="Manrope, Arial, sans-serif">${label}</text>
      </svg>
    </span>
  `;
}
