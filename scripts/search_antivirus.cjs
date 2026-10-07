const fs = require('fs');
const path = require('path');

function searchInDir(dir, searchStr) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const f of files) {
    const full = path.join(dir, f.name);
    if (f.isDirectory() && f.name !== 'node_modules' && f.name !== '.git') {
      searchInDir(full, searchStr);
    } else if (f.isFile() && (f.name.endsWith('.jsx') || f.name.endsWith('.js'))) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      lines.forEach((l, idx) => {
        if (l.toLowerCase().includes(searchStr.toLowerCase())) {
          console.log(full + ':' + (idx + 1) + ' -> ' + l.trim());
        }
      });
    }
  }
}

console.log('--- Search antivirus ---');
searchInDir('src', 'antivirus');
searchInDir('api', 'antivirus');
