import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
const require = createRequire(new URL('../nextjs-luns-se/package.json', import.meta.url));
const ts = require('typescript');
const source = readFileSync(new URL('../nextjs-luns-se/src/app/lib/calendarWeek.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exported = {};
new Function('exports', compiled)(exported);
const week = stamp => exported.calendarWeek(new Date(stamp));

test('kalendervecka behåller helgen och byter vid svensk midnatt', () => {
  assert.equal(week('2026-10-24T12:00:00Z'), 43);
  assert.equal(week('2026-10-25T22:59:59Z'), 43);
  assert.equal(week('2026-10-25T23:00:00Z'), 44);
});

test('årsskifte följer ISO och svensk tid, även sommartid', () => {
  assert.equal(week('2021-01-01T12:00:00Z'), 53);
  assert.equal(week('2021-01-04T00:00:00Z'), 1);
  assert.equal(week('2024-12-30T12:00:00Z'), 1);
  assert.equal(week('2026-07-05T21:59:59Z'), 27);
  assert.equal(week('2026-07-05T22:00:00Z'), 28);
});
