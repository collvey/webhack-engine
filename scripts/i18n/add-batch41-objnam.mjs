import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  ' containing %ld item%s': '，内含 %ld 件物品%s',
  ' (%u aum)': '（%u aum）',
  ' and its contents': '及其内容物',
  'Contents of ': '内容物：',
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n=0,d=0;
for (const [k,v] of Object.entries(add)){ if(k in json){d++;continue;} json[k]=v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json,null,2)+'\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
