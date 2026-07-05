const FOLDER_ID = '15wuHWn4jrLgd7cfCf1JL5h9Qhu3EIGb6';

function doGet() {
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const files = folder.getFiles();
  const result = [];

  while (files.hasNext()) {
    const file = files.next();
    if (file.getMimeType() === MimeType.FOLDER) {
      continue;
    }

    const id = file.getId();
    result.push({
      id,
      name: file.getName(),
      fileName: file.getName(),
      mimeType: file.getMimeType(),
      size: formatSize(file.getSize()),
      modifiedTime: file.getLastUpdated().toISOString(),
      downloadUrl: 'https://drive.google.com/uc?export=download&id=' + id,
      previewUrl: 'https://drive.google.com/file/d/' + id + '/preview',
    });
  }

  result.sort((a, b) => new Date(b.modifiedTime) - new Date(a.modifiedTime));

  return ContentService
    .createTextOutput(JSON.stringify({ configured: true, files: result, folderId: FOLDER_ID }))
    .setMimeType(ContentService.MimeType.JSON);
}

function formatSize(bytes) {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return (unit === 0 ? size : size.toFixed(1)) + ' ' + units[unit];
}
