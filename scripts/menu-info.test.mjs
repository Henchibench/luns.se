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
const { infoStatesLunchHours, stripInfoEmoji } = exports;

test('kl.-skrivna tider gör att reservtiden inte visas en gång till', () => {
  assert.equal(infoStatesLunchHours('Måndag- Fredag kl.11.30-13.30 · 195.-'), true);
  assert.equal(infoStatesLunchHours('Lunch serveras vardagar 11–14'), true);
  assert.equal(infoStatesLunchHours('195 kr inklusive kaffe'), false);
});

test('äldre emoji-signaler känns igen men visas inte', () => {
  assert.equal(infoStatesLunchHours('🕐 Mån–fre 11–14'), true);
  assert.equal(stripInfoEmoji('🕐 Mån–fre 11–14'), 'Mån–fre 11–14');
});
