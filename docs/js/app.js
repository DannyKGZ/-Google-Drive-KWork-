const worksGrid = document.getElementById('works-grid');
const worksStatus = document.getElementById('works-status');
const worksLive = document.getElementById('works-live');
const refreshBtn = document.getElementById('refresh-works');
const burger = document.getElementById('burger');
const nav = document.querySelector('.nav');
const contactForm = document.getElementById('contact-form');
const formNote = document.getElementById('form-note');

const POLL_INTERVAL_MS = 10000;

let knownFileIds = new Set();
let filesFingerprint = '';
let pollTimer = null;
let isConfigured = false;
let isFirstLoad = true;

function getFileExtension(fileName) {
  if (!fileName.includes('.')) return 'файл';
  return fileName.split('.').pop().toUpperCase();
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function buildFingerprint(files) {
  return files.map((file) => `${file.id}:${file.modifiedTime}`).join('|');
}

function showStatus(message, type = 'info') {
  worksStatus.hidden = false;
  worksStatus.textContent = message;
  worksStatus.className = `works-status works-status--${type}`;
}

function hideStatus() {
  worksStatus.hidden = true;
  worksStatus.textContent = '';
  worksStatus.className = 'works-status';
}

function showSkeleton() {
  worksGrid.innerHTML = `
    <div class="works-skeleton" aria-hidden="true"></div>
    <div class="works-skeleton" aria-hidden="true"></div>
    <div class="works-skeleton" aria-hidden="true"></div>
  `;
}

function updateLiveIndicator(syncing = false) {
  if (!worksLive) return;
  worksLive.hidden = !isConfigured;
  worksLive.classList.toggle('works-live--syncing', syncing);
  worksLive.querySelector('.works-live__text').textContent = syncing
    ? 'Проверяем новые файлы...'
    : `Автообновление каждые ${POLL_INTERVAL_MS / 1000} сек`;
}

function renderWorks(files, { highlightIds = [] } = {}) {
  const highlightSet = new Set(highlightIds);

  if (!files.length) {
    worksGrid.innerHTML = `
      <div class="works-empty">
        <p>В папке Google Drive пока нет файлов.</p>
        <p>Загрузите файл в папку — он появится здесь в течение ${POLL_INTERVAL_MS / 1000} секунд.</p>
      </div>
    `;
    return;
  }

  worksGrid.innerHTML = files
    .map(
      (file) => `
        <article class="work-card${highlightSet.has(file.id) ? ' work-card--new' : ''}" data-id="${escapeHtml(file.id)}">
          <div class="work-card__header">
            ${renderFileIcon(file.fileName)}
            <h3 class="work-card__title">${escapeHtml(file.name)}</h3>
          </div>
          <div class="work-card__meta">
            <span>${escapeHtml(getFileExtension(file.fileName))}</span>
            <span>${escapeHtml(file.size)}</span>
            <span>${formatDate(file.modifiedTime)}</span>
          </div>
          <div class="work-card__actions">
            <a href="${file.downloadUrl}" class="btn btn--primary" download="${escapeHtml(file.fileName)}" target="_blank" rel="noopener">
              ⬇ Скачать
            </a>
            <a href="${file.previewUrl}" class="btn btn--ghost" target="_blank" rel="noopener">
              👁 Просмотр
            </a>
          </div>
        </article>
      `
    )
    .join('');

  window.setTimeout(() => {
    worksGrid.querySelectorAll('.work-card--new').forEach((card) => {
      card.classList.remove('work-card--new');
    });
  }, 4000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function startPolling() {
  stopPolling();
  pollTimer = window.setInterval(() => {
    if (document.hidden || !isConfigured) return;
    loadWorks({ silent: true });
  }, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (pollTimer) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
}

function isStaticHosting() {
  return (
    location.hostname.endsWith('github.io') ||
    location.hostname.endsWith('gitlab.io') ||
    location.protocol === 'file:'
  );
}

function getAppsScriptUrl() {
  return window.SITE_CONFIG?.appsScriptUrl?.trim() || '';
}

function getApiBaseUrl() {
  const fromConfig = window.SITE_CONFIG?.apiBaseUrl?.trim();
  if (fromConfig) return fromConfig.replace(/\/$/, '');
  if (!isStaticHosting()) return '';
  return '';
}

function getDataJsonUrl() {
  return new URL('data/files.json', window.location.href).href;
}

function renderStaticSetupHelp() {
  return `
    <div class="works-empty">
      <p><strong>Каталог файлов ещё не загружен</strong></p>
      <p style="color:var(--text-muted); max-width:540px; margin:0 auto 1rem;">
        Для GitHub Pages добавьте секреты в репозиторий — GitHub Action сам обновит каталог:
      </p>
      <ol style="text-align:left; max-width:540px; margin:0 auto; color:var(--text-muted);">
        <li>GitHub → <strong>Settings → Secrets → Actions</strong></li>
        <li><code>GOOGLE_API_KEY</code> — ваш API-ключ</li>
        <li><code>GOOGLE_DRIVE_FOLDER_ID</code> — ID папки Drive</li>
        <li><strong>Actions</strong> → запустите workflow «Update Drive catalog»</li>
      </ol>
      <p style="color:var(--text-muted); margin-top:1rem;">
        Или укажите <code>appsScriptUrl</code> в <code>js/config.js</code> (Google Apps Script).
      </p>
    </div>
  `;
}

async function fetchStaticJson() {
  const response = await fetch(`${getDataJsonUrl()}?t=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) return null;

  const data = await response.json().catch(() => null);
  if (!data || !Array.isArray(data.files)) return null;

  return {
    configured: true,
    source: data.source || 'static-json',
    folderId: data.folderId,
    updatedAt: data.updatedAt,
    files: data.files,
  };
}

async function fetchWorksData() {
  const appsScriptUrl = getAppsScriptUrl();

  if (appsScriptUrl) {
    const response = await fetch(appsScriptUrl, { cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Не удалось получить файлы из Google Apps Script');
    }
    return data;
  }

  if (isStaticHosting()) {
    const staticData = await fetchStaticJson();
    if (staticData) return staticData;

    const apiBase = getApiBaseUrl();
    if (apiBase) {
      const response = await fetch(`${apiBase}/api/works`, { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (response.ok || data.error) return data;
    }

    return {
      configured: false,
      error: 'Каталог не найден. Добавьте секреты GOOGLE_API_KEY в GitHub Actions.',
      files: [],
    };
  }

  const response = await fetch('/api/works', { cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok && !data.error) {
    throw new Error('Не удалось связаться с сервером');
  }
  return data;
}

async function loadWorks({ silent = false } = {}) {
  if (!silent) {
    showSkeleton();
  } else {
    updateLiveIndicator(true);
  }

  try {
    const data = await fetchWorksData();

    if (!data.configured) {
      isConfigured = false;
      stopPolling();
      updateLiveIndicator(false);

      if (!silent) {
        showStatus(data.error, 'info');
        worksGrid.innerHTML = isStaticHosting() ? renderStaticSetupHelp() : `
          <div class="works-empty">
            <p><strong>Настройка Google Drive</strong></p>
            <ol style="text-align:left; max-width:520px; margin:1rem auto; color:var(--text-muted);">
              <li>Добавьте <code>GOOGLE_API_KEY</code> в <code>.env</code></li>
              <li>Запустите <code>npm start</code></li>
              <li>Откройте адрес из консоли (например http://localhost:3003)</li>
            </ol>
          </div>
        `;
      }
      return;
    }

    if (data.error) {
      isConfigured = false;
      stopPolling();
      updateLiveIndicator(false);

      if (!silent) {
        showStatus(data.error, 'error');
        worksGrid.innerHTML = `<div class="works-empty"><p>Не удалось загрузить файлы. Проверьте API-ключ и доступ к папке.</p></div>`;
      }
      return;
    }

    isConfigured = true;
    startPolling();
    updateLiveIndicator(false);

    const nextFingerprint = buildFingerprint(data.files);
    const newFileIds = data.files.filter((file) => !knownFileIds.has(file.id)).map((file) => file.id);
    const hasChanges = nextFingerprint !== filesFingerprint;

    if (hasChanges || isFirstLoad) {
      const shouldHighlight = silent && !isFirstLoad && newFileIds.length > 0;
      renderWorks(data.files, { highlightIds: shouldHighlight ? newFileIds : [] });

      filesFingerprint = nextFingerprint;
      knownFileIds = new Set(data.files.map((file) => file.id));

      if (shouldHighlight) {
        showStatus(
          `Добавлено ${newFileIds.length} ${pluralize(newFileIds.length, 'новый файл', 'новых файла', 'новых файлов')}`,
          'success'
        );
        window.setTimeout(hideStatus, 4000);
      } else if (!silent && data.files.length) {
        showStatus(`Загружено ${data.files.length} ${pluralize(data.files.length, 'файл', 'файла', 'файлов')}`, 'success');
        window.setTimeout(hideStatus, 3000);
      } else if (!silent) {
        hideStatus();
      }
    }

    isFirstLoad = false;
  } catch (err) {
    updateLiveIndicator(false);
    stopPolling();

    if (!silent) {
      if (isStaticHosting()) {
        showStatus('Для GitHub Pages нужен Google Apps Script (см. инструкцию ниже)', 'info');
        worksGrid.innerHTML = renderStaticSetupHelp();
      } else {
        showStatus('Ошибка сети. Проверьте, что сервер запущен (npm start) и открыт правильный порт.', 'error');
        worksGrid.innerHTML = `<div class="works-empty"><p>Не удалось связаться с сервером. Запустите <code>npm start</code> и откройте адрес из консоли.</p></div>`;
      }
    }
  }
}

function pluralize(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

burger?.addEventListener('click', () => {
  nav.classList.toggle('is-open');
});

nav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => nav.classList.remove('is-open'));
});

refreshBtn?.addEventListener('click', () => loadWorks({ silent: false }));

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && isConfigured) {
    loadWorks({ silent: true });
  }
});

contactForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  formNote.textContent = 'Сообщение отправлено. Мы свяжемся с вами в ближайшее время.';
  contactForm.reset();
  window.setTimeout(() => {
    formNote.textContent = '';
  }, 4000);
});

loadWorks({ silent: false });
