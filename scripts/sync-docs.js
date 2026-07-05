const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'public');
const dest = path.join(__dirname, '..', 'docs');
const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL || '';

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });

  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const fromPath = path.join(from, entry.name);
    const toPath = path.join(to, entry.name);

    if (entry.isDirectory()) {
      copyDir(fromPath, toPath);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  }
}

function injectAppsScriptUrl() {
  if (!appsScriptUrl) return;

  const configPath = path.join(dest, 'js', 'config.js');
  let content = fs.readFileSync(configPath, 'utf8');
  content = content.replace(
    /appsScriptUrl:\s*['"][^'"]*['"]/,
    `appsScriptUrl: '${appsScriptUrl}'`
  );
  fs.writeFileSync(configPath, content);
  console.log('Apps Script URL injected');
}

if (fs.existsSync(dest)) {
  fs.rmSync(dest, { recursive: true, force: true });
}

copyDir(src, dest);
injectAppsScriptUrl();
console.log('public → docs');