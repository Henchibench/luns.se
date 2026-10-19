import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(new URL('../nextjs-luns-se/package.json', import.meta.url));
const ts = require('typescript');
function moduleAt(path) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
  }}).outputText;
  const exports = {};
  new Function('exports', compiled)(exports);
  return exports;
}
const { discoverRestaurants: discover, dismissRestaurantNews: dismiss,
  parseRestaurantVisit: parse, initialRestaurantNews: initial } =
  moduleAt('../nextjs-luns-se/src/app/lib/restaurantNews.ts');
const nest = "Cuckoo's Nest";

test('första besöket sparar utbudet utan att kalla alla restauranger nya', () => {
  const first = discover(null, ['A', nest]);
  assert.deepEqual(first.pending, []);
  assert.deepEqual(discover(first, [nest, 'A']).pending, []);
});

test('endast tillagda restauranger ger nyhet, med stöd för flera samtidigt', () => {
  const first = discover(null, ['A']);
  const next = discover(first, ['A', 'B', nest, 'B']);
  assert.deepEqual(next.pending, ['B', nest]);
  assert.deepEqual(next.names, ['A', 'B', nest]);
  assert.deepEqual(discover(first, []).pending, []);
});

test('oläst nyhet överlever omladdning; läst nyhet kommer inte tillbaka', () => {
  const next = discover(discover(null, ['A']), ['A', nest]);
  assert.deepEqual(discover(parse(JSON.stringify(next)), ['A', nest]).pending, [nest]);
  assert.deepEqual(discover(dismiss(next), ['A', nest]).pending, []);
  assert.deepEqual(discover(dismiss(next), ['A', nest, 'B']).pending, ['B']);
});

test('att öppna en restaurang lämnar övriga nyheter olästa', () => {
  const next = discover(discover(null, ['A']), ['A', 'B', nest]);
  assert.deepEqual(dismiss(next, nest).pending, ['B']);
});

test('borttagning tar bort väntande nyhet; återinförande kan annonseras igen', () => {
  const next = discover(discover(null, ['A']), ['A', nest]);
  const removed = discover(next, ['A']);
  assert.deepEqual(removed.pending, []);
  assert.deepEqual(discover(removed, ['A', nest]).pending, [nest]);
});

test('områden har separata besök; första besöket i annat område är tyst', () => {
  const lindholmen = discover(discover(null, ['A']), ['A', nest]);
  const mjardevi = discover(null, ['B', 'C']);
  assert.deepEqual(mjardevi.pending, []);
  assert.deepEqual(discover(lindholmen, ['A', nest]).pending, [nest]);
});

test('övergången för gamla besökare annonserar bara Cuckoo’s Nest på Lindholmen', () => {
  assert.deepEqual(discover(null, ['A', nest], initial('Lindholmen')).pending, [nest]);
  assert.deepEqual(discover(null, ['A'], initial('Lindholmen')).pending, []);
  assert.deepEqual(initial('Mjärdevi'), []);
  const done = dismiss(discover(null, ['A', nest], initial('Lindholmen')));
  assert.deepEqual(discover(done, ['A', nest], initial('Lindholmen')).pending, []);
});

test('skadad eller okänd lagringsversion ger en tyst ny baslinje', () => {
  for (const raw of [null, '{', 'null', '{}', '{"version":2,"names":[],"pending":[]}',
    '{"version":1,"names":[3],"pending":[]}', '{"version":1,"names":[],"pending":[null]}']) {
    assert.equal(parse(raw), null);
    assert.deepEqual(discover(parse(raw), ['A', nest]).pending, []);
  }
});

test('restaurangregistret styr nyheter även när en meny saknas eller är tom', async () => {
  const { loadMenuData } = moduleAt('../nextjs-luns-se/src/app/lib/menu.ts');
  const original = globalThis.fetch;
  try {
    let menus = { A: [] };
    globalThis.fetch = async url => ({ json: async () => url.includes('restaurants')
      ? { restaurants: { A: { area: 'Lindholmen' }, [nest]: { area: 'Lindholmen' } } }
      : { menus } });
    const before = await loadMenuData();
    menus = { A: [], [nest]: ['Ingen lunchmeny tillgänglig'] };
    const after = await loadMenuData();
    assert.deepEqual(before.catalog, after.catalog);
    const visit = discover(null, before.catalog.map(r => r.name));
    assert.deepEqual(discover(visit, after.catalog.map(r => r.name)).pending, []);
  } finally {
    globalThis.fetch = original;
  }
});
