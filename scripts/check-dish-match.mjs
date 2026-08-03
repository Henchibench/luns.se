/**
 * Calibration check for the dish matcher.
 *
 * The matcher decides whether a starred dish has come back on the menu. Too
 * loose and it claims your favourite is served when it is not; too strict and
 * it never fires. There is no test suite in this project, so this script is
 * the safety net: run it after touching dishMatch.ts, or when a restaurant
 * rewrites how it phrases its menu.
 *
 *   node scripts/check-dish-match.mjs
 *
 * Exits non-zero if any expected case regresses.
 *
 * (The copy to a .mts temp file is what lets Node's type stripping load the
 * module — nextjs-luns-se is CommonJS, so a bare .ts import would fail.)
 */
import { readFileSync, copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'nextjs-luns-se/src/app/utils/dishMatch.ts');
const menusPath = join(root, 'nextjs-luns-se/public/data/menus.json');

const temp = join(mkdtempSync(join(tmpdir(), 'dishmatch-')), 'dishMatch.mts');
copyFileSync(source, temp);
const { dishSignature, signaturesMatch, similarity, MATCH_THRESHOLD } =
  await import(pathToFileURL(temp).href);

// Cases that encode the intent. Drawn from real menu text.
const CASES = [
  [true,  'Kooperativets klassiska Butter Halloumi– indisk gryta med friterad haloumi serveras med rostad mandel',
          'Kooperativets klassiska Butter Haloumi– indisk gryta med friterad haloumi serveras med rostad mandel'],
  [true,  'Poke bowl med lax', 'Pokebowl med lax'],
  [true,  'Murgh Masala – Indisk gryta med kyckling serveras med basmatiris',
          'Murgh masala – indisk gryta med kyckling, mangochutney'],
  [true,  'Bakad kolja serveras med hackat ägg, bacon & pepparrot samt brynt smör',
          'Bakad kolja serveras med dillkokt potatis, svampsås, citron och örtsallad'],
  [false, 'A2 - 12st Dumplings i Biffsoppa (Fläsk) - x', 'A2 - 15st Dumplings i Biffsoppa (Fläsk) - x'],
  [false, 'A2 - 15st Dumplings i Biffsoppa (Fläsk) - x', 'A5 - 15st Dumplings i Biffsoppa (Nöt) - x'],
  [false, 'Chicken red curry – Wokad kyckling i rödcurry serveras med jasminris',
          'Chicken cashew – Wokad kyckling i ostronsås serveras med jasminris'],
  [false, 'Fried rice Biryani toppat med kyckling', 'Fried rice Biryani toppat med rostade oumph'],
  [false, 'Helstekt fläskfilé med grönpepparsås', 'Örtstekt fläskfilé med rödvinssås'],
];

let failures = 0;
console.log(`Tröskel ${MATCH_THRESHOLD}\n`);
for (const [want, a, b] of CASES) {
  const sa = dishSignature(a);
  const sb = dishSignature(b);
  const got = signaturesMatch(sa, sb);
  const ok = got === want;
  if (!ok) failures++;
  console.log(
    `${ok ? ' ok ' : 'FEL '} ${want ? 'ska matcha ' : 'ska ej matcha'} ` +
    `(${similarity(sa, sb).toFixed(2)})  ${sa.slice(0, 38)} ~ ${sb.slice(0, 38)}`
  );
}

// Sanity sweep over the current corpus: anything matching inside one
// restaurant should be a dish that genuinely came back, not a variant.
const menus = JSON.parse(readFileSync(menusPath, 'utf8')).menus;
const byRestaurant = new Map();
for (const [restaurant, items] of Object.entries(menus)) {
  for (const item of items) {
    if (item.startsWith('INFO:')) continue;
    const parts = item.split('|');
    if (parts.length < 2) continue;
    const description = parts[1].replace(/<strong>.*?<\/strong>\s*-?\s*/, '').trim();
    const signature = dishSignature(description);
    if (signature.length < 4) continue;
    if (!byRestaurant.has(restaurant)) byRestaurant.set(restaurant, new Set());
    byRestaurant.get(restaurant).add(signature);
  }
}

console.log('\nMatchande par i nuvarande meny:');
let pairs = 0;
for (const [restaurant, set] of byRestaurant) {
  const list = [...set];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      if (signaturesMatch(list[i], list[j])) {
        console.log(`  [${restaurant}] ${list[i].slice(0, 40)} ~ ${list[j].slice(0, 40)}`);
        pairs++;
      }
    }
  }
}
if (pairs === 0) console.log('  (inga)');

console.log(failures ? `\n${failures} fall misslyckades` : '\nAlla fall korrekta');
process.exit(failures ? 1 : 0);
