const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'public');
const dest = path.join(__dirname, '..', 'docs');

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

if (fs.existsSync(dest)) {
  fs.rmSync(dest, { recursive: true, force: true });
}

copyDir(src, dest);
console.log('public → docs');
