const fs = require('fs');
const path = require('path');
const dir = 'node_modules/@getpapillon/papicons/lib/module/icons';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'index.js');
const icons = {};
for (const f of files) {
  const c = fs.readFileSync(path.join(dir, f), 'utf8');
  const m = c.match(/d:\s*"([^"]+)"/);
  if (m) icons[f.replace('.js', '')] = m[1];
}
console.log('Found', Object.keys(icons).length, 'icons');
fs.writeFileSync('papicons-paths.json', JSON.stringify(icons, null, 2));
