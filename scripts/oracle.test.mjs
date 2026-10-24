import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
const require = createRequire(new URL('../nextjs-luns-se/package.json', import.meta.url));
const ts = require('typescript');
const source = readFileSync(new URL('../nextjs-luns-se/src/app/lib/oracle.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exported = {};
new Function('exports', compiled)(exported);
const { nextLogoTaps, offeringsFromSections, chooseOffering } = exported;

test('five clicks must fit within three seconds and activation resets', () => {
  let taps=[];
  for(const stamp of [100,500,1000,1700]) {
    const next=nextLogoTaps(taps,stamp); assert.equal(next.open,false); taps=next.taps;
  }
  assert.deepEqual(nextLogoTaps(taps,3100),{taps:[],open:true});
  assert.equal(nextLogoTaps(taps,3101).open,false);
  assert.equal(nextLogoTaps([],3200).open,false);
});

test('only visible real dishes participate, never images or old reference menus', () => {
  const dish={description:'Källans rätt med tillbehör',price:'145 kr'};
  const pool=offeringsFromSections([
    {name:'A',dishes:[dish,dish,{description:'  ',price:''}]},
    {name:'B',dishes:[],referenceMenu:{dishes:[dish]},menuImage:{url:'old.jpg'}},
    {name:'C',dishes:[{description:'Annan rätt',price:''}]},
  ]);
  assert.deepEqual(pool,[{restaurant:'A',...dish},{restaurant:'C',description:'Annan rätt',price:''}]);
  assert.deepEqual(offeringsFromSections([]),[]);
});

test('draw returns a source object, covers both endpoints and has no invented fallback', () => {
  const pool=[{restaurant:'A',description:'Rätt A',price:'100 kr'},{restaurant:'B',description:'Rätt B',price:''}];
  assert.equal(chooseOffering(pool,()=>0),pool[0]);
  assert.equal(chooseOffering(pool,()=>0.999999),pool[1]);
  assert.equal(chooseOffering([],()=>0.5),null);
});
