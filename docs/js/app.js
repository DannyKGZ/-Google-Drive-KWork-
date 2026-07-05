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

async function fetchWorksData() {
  const appsScriptUrl = window.SITE_CONFIG?.appsScriptUrl?.trim();

  if (appsScriptUrl) {
    const response = await fetch(appsScriptUrl, { cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Не удалось получить файлы из Google Apps Script');
    }
    return data;
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
        worksGrid.innerHTML = `
          <div class="works-empty">
            <p><strong>Настройка Google Drive API</strong></p>
            <ol style="text-align:left; max-width:520px; margin:1rem auto; color:var(--text-muted);">
              <li><strong>GitHub Pages:</strong> укажите URL Apps Script в <code>public/js/config.js</code></li>
              <li><strong>Локально:</strong> добавьте ключ в <code>.env</code> и запустите <code>npm start</code></li>
              <li><strong>Apps Script:</strong> разверните <code>apps-script/Code.gs</code> на <a href="https://script.google.com" target="_blank" rel="noopener">script.google.com</a></li>
              <li>Deploy → Web app → доступ «Anyone» → скопируйте URL</li>
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
  } catch {
    updateLiveIndicator(false);

    if (!silent) {
      showStatus('Ошибка сети при загрузке каталога работ.', 'error');
      worksGrid.innerHTML = `<div class="works-empty"><p>Не удалось связаться с сервером.</p></div>`;
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
