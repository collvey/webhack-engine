import fs from 'fs';
const src = fs.readFileSync('src/shknam.c', 'utf8');
const arrRe = /static const char \*const (shk\w+)\[\] = \{([\s\S]*?)\n\};/g;
let m; const names = new Set();
while ((m = arrRe.exec(src))) {
  const body = m[2];
  const strRe = /"((?:[^"\\]|\\.)*)"/g; let s;
  while ((s = strRe.exec(body))) names.add(s[1]);
}
for (const extra of ['+Izchak', '-Lucrezia', '+Dirk']) names.add(extra);
const arr = [...names];
console.log('total unique raw:', arr.length);
fs.writeFileSync('scripts/i18n/_shknames_raw.json', JSON.stringify(arr));
console.log(arr.join('\n'));
