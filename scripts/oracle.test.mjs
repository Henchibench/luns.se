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
  const dish={category:'Lunch',description:'Källans rätt med tillbehör',price:'145 kr'};
  const pool=offeringsFromSections([
    {name:'A',dishes:[dish,dish,{category:'Lunch',description:'  ',price:''}]},
    {name:'B',dishes:[],referenceMenu:{dishes:[dish]},menuImage:{url:'old.jpg'}},
    {name:'C',dishes:[{category:'Fisk',description:'Annan rätt',price:''}]},
  ]);
  assert.deepEqual(pool,[{restaurant:'A',...dish},{restaurant:'C',category:'Fisk',description:'Annan rätt',price:''}]);
  assert.deepEqual(offeringsFromSections([]),[]);
});

test('draw returns a source object, covers both endpoints and has no invented fallback', () => {
  const pool=[{restaurant:'A',description:'Rätt A',price:'100 kr'},{restaurant:'B',description:'Rätt B',price:''}];
  assert.equal(chooseOffering(pool,()=>0),pool[0]);
  assert.equal(chooseOffering(pool,()=>0.999999),pool[1]);
  assert.equal(chooseOffering([],()=>0.5),null);
});

 test('explicit extras are not a lunch, and source category and price distinguish dishes', () => {
  const dishes = [
    {category:'Benne bites',description:'Tiramisu',price:'35 kr'},
    {category:'Sallad',description:'Tillval: bulgur',price:'5 kr'},
    {category:'Pajer',description:'Dressing: vitlök',price:''},
    {category:'Caesarsallad',description:'Kyckling',price:'110 kr'},
    {category:'Sallad',description:'Kyckling',price:'115 kr'},
  ];
  const pool=offeringsFromSections([{name:'A',dishes}]);
  assert.equal(pool.length,2);
  assert.deepEqual(pool.map(dish=>dish.category),['Caesarsallad','Sallad']);
});

const directionSource=readFileSync(new URL('../nextjs-luns-se/src/app/components/oracle/direction.ts',import.meta.url),'utf8');
const directed={};
new Function('exports',ts.transpileModule(directionSource,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(directed);
test('the rings align at the verdict boundary and stay locked without an early flash',()=>{
  assert.equal(directed.direction('arrival',0,false).reveal,0);
  assert.equal(directed.direction('arrival',11,false).travel,1);
  const nearEnd=directed.direction('ritual',7.99,false);
  const end=directed.direction('ritual',directed.RITUAL_MS/1000,false);
  const verdict=directed.direction('verdict',0,false);
  assert.equal(directed.direction('ritual',5,false).alignment,0);
  assert.ok(nearEnd.alignment>.99&&nearEnd.alignment<1);
  assert.equal(end.alignment,1);
  assert.equal(end.energy,0);
  assert.equal(end.flash,0);
  assert.equal(verdict.alignment,end.alignment);
  assert.ok(verdict.flash>0);
  for(const phase of ['verdict','declined']) {
    assert.equal(directed.direction(phase,30,false).alignment,1);
  }
  for(const phase of ['arrival','ritual','verdict','declined']) {
    const d=directed.direction(phase,0,true);
    assert.equal(d.reveal,1); assert.equal(d.travel,1);
    assert.equal(d.energy,0); assert.equal(d.flash,0);
  }
});

test('recorded lines determine the timing, including a slow delivery and the final response', () => {
  const score = directed.oracleTiming({call:4, cosmos:8, lunch:5, ritual:9, declined:7});
  assert.ok(score.cosmosAt >= score.callAt + 4000);
  assert.ok(score.lunchAt >= score.cosmosAt + 8000);
  assert.ok(score.arrivalMs > score.lunchAt + 5000);
  assert.ok(score.ritualMs >= 9000 + 2800);
  assert.ok(score.declinedMs > 7000);
  assert.ok(directed.oracleTiming().arrivalMs >= directed.ARRIVAL_MS);
  assert.deepEqual(directed.direction('loading',30,false),{reveal:0,travel:0,energy:0,alignment:0,flash:0});
});

test('leaving the tab freezes the story, including when a phase resets during loading', () => {
  let now = 0;
  const clock = directed.createOracleClock(() => now);
  now = 1200; assert.equal(clock.elapsed(),1200);
  clock.pause(); now = 90000; clock.pause();
  assert.equal(clock.elapsed(),1200);
  clock.resume(); clock.resume(); now = 90300;
  assert.equal(clock.elapsed(),1500);
  clock.pause(); clock.reset(); now = 100000;
  assert.equal(clock.elapsed(),0);
  clock.resume(); now = 100500;
  assert.equal(clock.elapsed(),500);
});
