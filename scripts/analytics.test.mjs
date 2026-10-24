import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';

const require = createRequire(new URL('../nextjs-luns-se/package.json', import.meta.url));
const ts = require('typescript');
const source = readFileSync(new URL('../nextjs-luns-se/src/app/utils/analytics.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function setup({ hostname = 'luns.se', stored = new Map(), track, storageBlocked = false, trackerMissing = false } = {}) {
  const calls = [];
  const storage = {
    getItem(key) { if (storageBlocked) throw Error('storage blocked'); return stored.get(key) ?? null; },
    setItem(key, value) { if (storageBlocked) throw Error('storage blocked'); stored.set(key, value); },
    removeItem(key) { stored.delete(key); },
  };
  const context = {
    exports: {}, localStorage: storage,
    window: { location: { hostname }, umami: trackerMissing ? undefined : {
      track(...args) { calls.push(args); return track?.(...args); },
    } },
  };
  vm.runInNewContext(compiled, context);
  return { discover: context.exports.trackOracleDiscovery, calls, stored, context };
}

test('discovery sends only its name and counts once across openings and page loads', async () => {
  const first = setup();
  await first.discover();
  await first.discover();
  assert.deepEqual(first.calls, [['oracle-discovered']]);
  const nextPage = setup({ stored: first.stored });
  await nextPage.discover();
  assert.equal(nextPage.calls.length, 0);
});

test('a pending discovery is not sent twice from another opening or tab', async () => {
  let finish;
  const first = setup({ track: () => new Promise(resolve => { finish = resolve; }) });
  const pending = first.discover();
  await first.discover();
  const anotherTab = setup({ stored: first.stored });
  await anotherTab.discover();
  assert.equal(first.calls.length, 1);
  assert.equal(anotherTab.calls.length, 0);
  finish();
  await pending;
});

test('preview, localhost, disabled tracking and unavailable storage never count or mark a discovery', async () => {
  for (const options of [
    { hostname: '10.0.1.34' }, { hostname: 'localhost' },
    { hostname: 'luns.se.example.org' }, { trackerMissing: true },
    { stored: new Map([['umami.disabled', '1']]) }, { storageBlocked: true },
  ]) {
    const page = setup(options);
    await page.discover();
    assert.equal(page.calls.length, 0);
    assert.equal(page.stored.has('luns-oracle-discovered'), false);
  }
});

test('a throwing or rejecting tracker cannot break the oracle and allows a later attempt', async () => {
  for (const track of [() => { throw Error('unavailable'); }, () => Promise.reject(Error('unavailable'))]) {
    const page = setup({ track });
    await assert.doesNotReject(page.discover());
    assert.equal(page.stored.has('luns-oracle-discovered'), false);
    page.context.window.umami.track = (...args) => page.calls.push(args);
    await page.discover();
    assert.equal(page.calls.length, 2);
    assert.equal(page.stored.get('luns-oracle-discovered'), '1');
  }
});

test('discovery is safe during server rendering', async () => {
  const context = { exports: {} };
  vm.runInNewContext(compiled, context);
  await assert.doesNotReject(context.exports.trackOracleDiscovery());
});
