import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const hash=s=>createHash('sha256').update(s).digest('hex');
test('alla original och avsnitt är bevarade utan luckor',()=>{
 const c=JSON.parse(read('docs/minne/katalog.json'));
 assert.equal(c.sources.length,3);
 for(const source of c.sources) {
  const text=read(source.archive),lines=text.split('\n');
  assert.equal(hash(text),source.sha256);
  let next=1;
  for(const e of c.entries.filter(e=>e.source===source.archive)) {
   assert.equal(e.sourceStart,next);
   const imported=read(e.file).split('\n').slice(e.startLine-1,e.endLine).join('\n');
   assert.equal(imported,lines.slice(e.sourceStart-1,e.sourceEnd).join('\n'));
   assert.equal(hash(imported),e.sha256);
   next=e.sourceEnd+1;
  }
  assert.equal(next,lines.length+1);
 }
});
test('korta instruktioner, fungerande ämneslänkar och historikmarkering',()=>{
 for(const p of ['AGENTS.md','app/scrapers/AGENTS.md']) assert.ok(read(p).split('\n').length<100);
 assert.match(read('AGENTS.md'),/ALDRIG direkt till main/);
 assert.match(read('app/scrapers/AGENTS.md'),/Hitta aldrig på/);
 for(const file of ['docs/index.md','docs/minne/register.md']) {
  for(const m of read(file).matchAll(/\]\(([^)]+)\)/g)) assert.ok(fs.existsSync(path.resolve(root,path.dirname(file),m[1])),m[1]);
 }
 assert.match(read('docs/sakerhet.md'),/ingen ny sårbarhetsskanning/);
});
