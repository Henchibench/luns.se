import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(new URL('../nextjs-luns-se/package.json', import.meta.url));
const ts = require('typescript');
const source = readFileSync(new URL('../nextjs-luns-se/src/app/lib/menu.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
}}).outputText;
const exports = {};
new Function('exports', compiled)(exports);
const { parseRestaurants } = exports;
const image = {
  url: 'https://images.squarespace-cdn.com/menu/v.39.jpg',
  week: 39, valid_from: '2026-09-21', valid_until: '2026-09-25',
};
const dish = 'Måndag|<strong>Dagens</strong> - Test av rätt (159 kr)';
function parse(rows, now = '2026-09-21T10:00:00Z') {
  return parseRestaurants({ BO: rows }, {}, new Date(now))[0];
}

test('bilden är metadata; pris, info och maträkning påverkas inte', () => {
  const result = parse([dish, 'INFO:Måndag - Restaurant Info: Kaffe ingår', 'MENU_IMAGE:'+JSON.stringify(image)]);
  assert.equal(result.dishes.length, 1);
  assert.equal(result.dishes[0].price, '159:-');
  assert.deepEqual(result.info.Måndag, ['Kaffe ingår']);
  assert.deepEqual(result.menuImage, image);
});

test('ny bild utan avskrift blir varken maträtt eller påstådd saknad meny', () => {
  const result = parse(['MENU_IMAGE:'+JSON.stringify(image)]);
  assert.equal(result.dishes.length, 0);
  assert.deepEqual(result.menuStatus, {});
  assert.equal(result.menuImage.url, image.url);
});

test('gammalt bygge döljer rätter och bild på helgen, nästa vecka och samma vecka nästa år', () => {
  for (const date of ['2026-09-26T10:00:00Z','2026-09-28T10:00:00Z','2027-09-27T10:00:00Z']) {
    const result = parse([dish, 'INFO:Måndag - Restaurant Info: Gammal info', 'MENU_IMAGE:'+JSON.stringify(image)], date);
    assert.equal(result.dishes.length, 0);
    assert.equal(result.menuImage, undefined);
    assert.deepEqual(result.info, {});
    assert.match(result.menuStatus.Måndag, /gäller inte veckan/);
  }
});

test('skadad metadata och andra URL-protokoll underkänns utan krasch', () => {
  for (const raw of ['{', JSON.stringify({...image, url:'javascript:alert(1)'}), JSON.stringify({...image, valid_until:'2027-09-25'})]) {
    const result = parse([dish, 'MENU_IMAGE:'+raw]);
    assert.equal(result.dishes.length, 0);
    assert.equal(result.menuImage, undefined);
  }
});

test('övriga restaurangers menyer påverkas inte av bildens veckospärr', () => {
  assert.equal(parse([dish], '2027-01-01T10:00:00Z').dishes.length, 1);
});
