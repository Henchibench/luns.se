import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(new URL('../nextjs-luns-se/package.json', import.meta.url));
const ts = require('typescript');
function load(path, dependencies = {}, storage) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
  }}).outputText;
  const exports = {};
  new Function('exports', 'require', 'localStorage', compiled)(exports, name => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  }, storage);
  return exports;
}
const news = load('../nextjs-luns-se/src/app/lib/news.ts');
function visitor({ saved = '13', first = false, blocked = false } = {}) {
  let state;
  let mounted = false;
  let effect;
  const storage = {
    getItem() { if (blocked) throw Error('blocked'); return saved; },
    setItem(key, value) { if (blocked) throw Error('blocked'); saved = value; },
  };
  const { useNews } = load('../nextjs-luns-se/src/app/hooks/useNews.ts', {
    react: {
      useState(initial) { if (state === undefined) state = initial; return [state, value => { state = value; }]; },
      useEffect(callback) { if (!mounted) effect = callback; },
      useCallback(callback) { return callback; },
    },
    '../lib/news': news,
    './useWelcome': { welcomeSeen: () => !first },
    '../utils/analytics': { trackEvent() {} },
  }, storage);
  return {
    render(area) {
      let result = useNews(area, true);
      if (!mounted) { mounted = true; effect(); result = useNews(area, true); }
      return result;
    },
    saved: () => saved,
  };
}

test('Kooperativet syns bara på Lindholmen; gemensamma nyheter finns kvar', () => {
  for (const area of [undefined, 'Mjärdevi', 'Järntorget/Linné', 'Lindholmen']) {
    const visible = news.visibleNews(area, true);
    assert.equal(visible.some(item => item.title === 'Kooperativets meny är på banan igen'), area === 'Lindholmen');
    assert.ok(visible.some(item => item.title === 'Större text som standard'));
    assert.equal(news.latestNewsVersion(area, true), area === 'Lindholmen' ? 14 : 13);
  }
  assert.ok(!news.visibleNews('Lindholmen', false).some(item => item.requiresContact));
});

test('version 13 ger oläst bara för Lindholmen, även efter laddat platsval', () => {
  const user = visitor();
  assert.equal(user.render(undefined).unread, false);
  assert.equal(user.render('Mjärdevi').unread, false);
  assert.equal(user.render('Lindholmen').unread, true);
  user.render('Lindholmen').markSeen(true);
  assert.equal(user.saved(), '14');
  assert.equal(user.render('Lindholmen').unread, false);
  assert.equal(visitor({ saved: user.saved() }).render('Lindholmen').unread, false);
});

test('manuell öppning i annat område kvitterar inte Lindholmens nyhet', () => {
  const user = visitor();
  user.render('Mjärdevi').markSeen();
  assert.equal(user.saved(), '13');
  assert.equal(user.render('Lindholmen').unread, true);
  user.render('Lindholmen').markSeen();
  user.render('Mjärdevi').markSeen();
  assert.equal(user.saved(), '14');
});

test('nya besökare får tyst baslinje, också om de väljer Lindholmen senare', () => {
  const user = visitor({ first: true, saved: null });
  assert.equal(user.render(undefined).unread, false);
  assert.equal(user.saved(), String(news.NEWS_VERSION));
  assert.equal(user.render('Lindholmen').unread, false);
});

test('äldre gemensamma nyheter kan fortfarande annonseras i andra områden', () => {
  const user = visitor({ saved: '12' });
  assert.equal(user.render('Mjärdevi').unread, true);
  user.render('Mjärdevi').markSeen();
  assert.equal(user.saved(), '13');
  assert.equal(user.render('Mjärdevi').unread, false);
});

test('blockerad eller skadad lagring ger ingen automatisk nyhetsruta', () => {
  assert.equal(visitor({ blocked: true }).render('Lindholmen').unread, false);
  assert.equal(visitor({ saved: 'trasigt' }).render('Lindholmen').unread, false);
});

test('alla poster har en publicerad version och senaste räknaren stämmer', () => {
  for (const item of news.NEWS_ITEMS) assert.ok(Number.isInteger(item.version) && item.version > 0);
  assert.equal(Math.max(...news.NEWS_ITEMS.map(item => item.version)), news.NEWS_VERSION);
});
